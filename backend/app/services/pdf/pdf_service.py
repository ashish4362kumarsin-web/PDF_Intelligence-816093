from __future__ import annotations

from io import BytesIO
import re

import PyPDF2

from app.core.config import settings
from app.core.logging import logger


def _clean_text_payload(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def detect_scanned_pdf(file_bytes: bytes, page_limit: int = 10) -> bool:
    try:
        reader = PyPDF2.PdfReader(BytesIO(file_bytes))
        sample_pages = list(reader.pages[:page_limit])
        if not sample_pages:
            return False

        total_length = 0
        for page in sample_pages:
            text = page.extract_text() or ''
            total_length += len(text.strip())
        return total_length < max(180, len(sample_pages) * 120)
    except Exception:
        return False


def _ocr_pdf_bytes(file_bytes: bytes) -> str:
    try:
        from pdf2image import convert_from_bytes  # type: ignore
        import pytesseract  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional runtime dependency
        raise RuntimeError('OCR dependencies are not installed') from exc

    try:
        images = convert_from_bytes(file_bytes, dpi=180, first_page=1, last_page=min(20, len(PyPDF2.PdfReader(BytesIO(file_bytes)).pages)))
    except Exception as exc:  # pragma: no cover - optional runtime dependency
        raise RuntimeError('PDF OCR failed') from exc

    pages: list[str] = []
    for image in images:
        try:
            text = pytesseract.image_to_string(image, config='--psm 6')
        except Exception:  # pragma: no cover - optional OCR runtime problem
            text = ''
        cleaned = _clean_text_payload(text)
        if cleaned:
            pages.append(cleaned)
    return '\n\n'.join(pages)


def validate_pdf_bytes(file_bytes: bytes, filename: str) -> dict[str, object]:
    if not filename.lower().endswith('.pdf'):
        raise ValueError('unsupported file type')

    max_size = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_size:
        raise ValueError('file too large')

    if not file_bytes.strip():
        raise ValueError('corrupted PDF')

    try:
        reader = PyPDF2.PdfReader(BytesIO(file_bytes))
        page_count = len(reader.pages)
        metadata = reader.metadata or {}
    except Exception as exc:  # pragma: no cover - runtime dependent
        logger.exception('PDF validation failed for %s', filename)
        raise ValueError('corrupted PDF') from exc

    return {
        'filename': filename,
        'size_bytes': len(file_bytes),
        'page_count': page_count,
        'title': getattr(metadata, 'title', None) or filename,
        'author': getattr(metadata, 'author', None) or 'Unknown',
    }


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(BytesIO(file_bytes))
        text_pages: list[str] = []
        for page in reader.pages:
            page_text = page.extract_text() or ''
            if page_text.strip():
                text_pages.append(page_text.strip())

        joined = '\n\n'.join(text_pages)
        if joined.strip():
            return joined

        if detect_scanned_pdf(file_bytes):
            try:
                ocr_text = _ocr_pdf_bytes(file_bytes)
                if ocr_text.strip():
                    return ocr_text
            except RuntimeError as exc:
                logger.warning('OCR fallback unavailable for scanned PDF: %s', exc)

        return ''
    except Exception as exc:  # pragma: no cover - runtime dependent
        logger.exception('PDF text extraction failed')
        raise ValueError('PDF processing failed') from exc


def search_document_content(text: str, query: str, max_matches: int = 5) -> list[dict[str, object]]:
    if not text or not query or not query.strip():
        return []

    normalized_query = ' '.join(query.strip().split())
    terms = [token.lower() for token in re.findall(r'[A-Za-z0-9][A-Za-z0-9\-\.]*', normalized_query)]
    if not terms:
        return []

    matches: list[dict[str, object]] = []
    text_lower = text.lower()
    for term in terms:
        start = 0
        while True:
            index = text_lower.find(term, start)
            if index == -1:
                break
            snippet_start = max(0, index - 80)
            snippet_end = min(len(text), index + len(term) + 120)
            snippet = text[snippet_start:snippet_end].replace('\n', ' ')
            snippet = re.sub(r'\s+', ' ', snippet).strip()
            if snippet:
                matches.append({'page_number': None, 'snippet': snippet})
            start = index + 1

    deduplicated: list[dict[str, object]] = []
    seen: set[str] = set()
    for item in matches:
        fingerprint = str(item['snippet'])
        if fingerprint not in seen:
            deduplicated.append(item)
            seen.add(fingerprint)

    return deduplicated[:max_matches]


def select_relevant_context(text: str, question: str, max_context_characters: int = 24000) -> str:
    chunk_size = 6000
    overlap = 600
    step = chunk_size - overlap
    chunks = [text[index:index + chunk_size] for index in range(0, len(text), step)]
    if not chunks:
        return ''

    terms = set(re.findall(r'\b[a-zA-Z0-9]{3,}\b', question.lower()))
    scored_chunks = [
        (sum(chunk.lower().count(term) for term in terms), index, chunk)
        for index, chunk in enumerate(chunks)
    ]
    ranked = sorted(scored_chunks, key=lambda item: item[0], reverse=True)
    selected: list[tuple[int, str]] = []
    used_characters = 0
    for _, index, chunk in ranked:
        separator_length = 2 if selected else 0
        remaining = max_context_characters - used_characters - separator_length
        if remaining <= 0:
            break
        selected_chunk = chunk[:remaining]
        selected.append((index, selected_chunk))
        used_characters += separator_length + len(selected_chunk)
        if len(selected_chunk) < len(chunk):
            break

    return '\n\n'.join(chunk for _, chunk in sorted(selected))

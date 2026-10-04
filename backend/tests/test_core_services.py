from __future__ import annotations

from io import BytesIO
import unittest

from fastapi import HTTPException
from PyPDF2 import PdfWriter

from app.api.dependencies import get_current_user
from app.schemas.common import MindMapResponse
from app.services.pdf.pdf_service import (
    detect_scanned_pdf,
    extract_text_from_pdf,
    search_document_content,
    select_relevant_context,
    validate_pdf_bytes,
)


class PdfServiceTests(unittest.TestCase):
    def test_valid_pdf_metadata_and_empty_text(self) -> None:
        output = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=300, height=400)
        writer.write(output)
        contents = output.getvalue()

        metadata = validate_pdf_bytes(contents, 'blank.pdf')
        self.assertEqual(metadata['page_count'], 1)
        self.assertEqual(extract_text_from_pdf(contents), '')

    def test_rejects_corrupted_pdf(self) -> None:
        with self.assertRaisesRegex(ValueError, 'corrupted PDF'):
            validate_pdf_bytes(b'not a pdf', 'broken.pdf')

    def test_rejects_non_pdf_filename(self) -> None:
        with self.assertRaisesRegex(ValueError, 'unsupported file type'):
            validate_pdf_bytes(b'content', 'notes.txt')

    def test_context_selection_is_bounded_and_uses_query_terms(self) -> None:
        text = ('ordinary material ' * 2500) + ('needle evidence ' * 400)
        context = select_relevant_context(text, 'needle evidence')

        self.assertLessEqual(len(context), 24000)
        self.assertIn('needle evidence', context)

    def test_scanned_pdf_detection_uses_text_density(self) -> None:
        output = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=300, height=400)
        writer.write(output)
        pdf_bytes = output.getvalue()
        self.assertTrue(detect_scanned_pdf(pdf_bytes))

    def test_document_search_returns_snippets_for_matches(self) -> None:
        text = 'Quarterly revenue rose by 20 percent. Revenue planning for the next quarter is important.'
        matches = search_document_content(text, 'revenue')
        self.assertTrue(matches)
        self.assertIn('revenue', matches[0]['snippet'].lower())


class ApiBoundaryTests(unittest.TestCase):
    def test_missing_bearer_token_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as error:
            get_current_user(None)

        self.assertEqual(error.exception.status_code, 401)

    def test_mind_map_schema_builds_recursive_ids(self) -> None:
        result = MindMapResponse.model_validate({
            'root': {
                'label': 'Document',
                'children': [{'label': 'Topic'}],
            }
        })

        self.assertTrue(result.root.id)
        self.assertTrue(result.root.children[0].id)


if __name__ == '__main__':
    unittest.main()

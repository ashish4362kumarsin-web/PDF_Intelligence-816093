from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import PurePosixPath
from threading import Thread
from typing import Any
from uuid import uuid4

from google.api_core.exceptions import NotFound

from app.core.logging import logger
from app.services.firebase.firebase_service import firebase_service
from app.services.pdf.pdf_service import (
    detect_scanned_pdf,
    extract_text_from_pdf,
    search_document_content,
    validate_pdf_bytes,
)


class DocumentNotFoundError(Exception):
    pass


def _normalize_filename(filename: str) -> str:
    safe_filename = PurePosixPath(filename.replace('\\', '/')).name
    safe_filename = re.sub(r'[\x00-\x1f\x7f]', '', safe_filename).strip()[:200] or 'document.pdf'
    return safe_filename


def _document_payload(document_id: str, data: dict[str, Any]) -> dict[str, Any]:
    uploaded_at = data.get('uploadedAt')
    if hasattr(uploaded_at, 'isoformat'):
        uploaded_at = uploaded_at.isoformat()
    return {
        'id': document_id,
        'title': data.get('title', 'Untitled PDF'),
        'status': data.get('status', 'failed'),
        'uploadedAt': uploaded_at,
        'size': data.get('size', 0),
        'pages': data.get('pageCount'),
    }


def _set_document_status(document_id: str, **updates: Any) -> None:
    database = firebase_service.get_firestore()
    database.collection('documents').document(document_id).update(updates)


def _process_document_background(owner_id: str, document_id: str, file_bytes: bytes, filename: str) -> None:
    database = firebase_service.get_firestore()
    bucket = firebase_service.get_storage_bucket()
    document_ref = database.collection('documents').document(document_id)
    try:
        document_ref.update({
            'status': 'processing',
            'processingStage': 'extracting',
            'processingError': None,
            'updatedAt': datetime.now(timezone.utc),
        })

        extracted_text = extract_text_from_pdf(file_bytes)
        if not extracted_text.strip():
            raise ValueError('No readable text was found in this PDF')

        text_path = f'users/{owner_id}/documents/{document_id}/extracted.txt'
        bucket.blob(text_path).upload_from_string(extracted_text, content_type='text/plain; charset=utf-8')
        document_ref.update({
            'status': 'completed',
            'processingStage': 'completed',
            'textPath': text_path,
            'processedAt': datetime.now(timezone.utc),
            'scanDetected': detect_scanned_pdf(file_bytes),
            'processingError': None,
            'updatedAt': datetime.now(timezone.utc),
        })
    except Exception as exc:
        logger.exception('Background PDF processing failed for user %s document %s', owner_id, document_id)
        document_ref.update({
            'status': 'failed',
            'processingStage': 'failed',
            'processingError': str(exc)[:500],
            'updatedAt': datetime.now(timezone.utc),
            'title': filename,
        })


def list_documents(owner_id: str) -> list[dict[str, Any]]:
    database = firebase_service.get_firestore()
    records = database.collection('documents').where('ownerId', '==', owner_id).stream()
    result = [_document_payload(record.id, record.to_dict() or {}) for record in records]
    return sorted(result, key=lambda item: item.get('uploadedAt') or '', reverse=True)


def search_documents(owner_id: str, query: str) -> list[dict[str, Any]]:
    if not query or not query.strip():
        return []

    results: list[dict[str, Any]] = []
    for document in list_documents(owner_id):
        try:
            text = get_document_text(owner_id, document['id'])
        except (DocumentNotFoundError, ValueError, RuntimeError):
            continue

        matches = search_document_content(text, query)
        for match in matches:
            results.append({
                'documentId': document['id'],
                'documentName': document['title'],
                'pageNumber': match.get('page_number'),
                'snippet': match.get('snippet', ''),
            })
    return results[:20]


def store_document(owner_id: str, filename: str, file_bytes: bytes) -> dict[str, Any]:
    metadata = validate_pdf_bytes(file_bytes, filename)
    document_id = str(uuid4())
    safe_filename = _normalize_filename(filename)
    pdf_path = f'users/{owner_id}/documents/{document_id}/original.pdf'
    text_path = f'users/{owner_id}/documents/{document_id}/extracted.txt'
    database = firebase_service.get_firestore()
    bucket = firebase_service.get_storage_bucket()
    pdf_blob = bucket.blob(pdf_path)

    try:
        pdf_blob.upload_from_string(file_bytes, content_type='application/pdf')
        document_data = {
            'ownerId': owner_id,
            'title': safe_filename,
            'status': 'queued',
            'processingStage': 'uploading',
            'uploadedAt': datetime.now(timezone.utc),
            'size': metadata['size_bytes'],
            'pageCount': metadata['page_count'],
            'storagePath': pdf_path,
            'textPath': text_path,
            'processingError': None,
            'scanDetected': False,
        }
        database.collection('documents').document(document_id).set(document_data)
    except Exception:
        logger.exception('PDF storage failed for user %s and document %s', owner_id, document_id)
        try:
            pdf_blob.delete()
        except NotFound:
            pass
        raise

    processing = Thread(
        target=_process_document_background,
        args=(owner_id, document_id, file_bytes, safe_filename),
        daemon=True,
    )
    processing.start()

    return _document_payload(document_id, document_data)


def _owned_document(owner_id: str, document_id: str) -> dict[str, Any]:
    snapshot = firebase_service.get_firestore().collection('documents').document(document_id).get()
    data = snapshot.to_dict()
    if not snapshot.exists or not data or data.get('ownerId') != owner_id:
        raise DocumentNotFoundError(document_id)
    return data


def get_document_text(owner_id: str, document_id: str) -> str:
    data = _owned_document(owner_id, document_id)
    text_path = data.get('textPath')
    if not text_path:
        raise ValueError('Document is still processing')
    try:
        return firebase_service.get_storage_bucket().blob(text_path).download_as_text(encoding='utf-8')
    except NotFound as exc:
        raise ValueError('Document text is not ready yet') from exc


def download_document(owner_id: str, document_id: str) -> tuple[bytes, str]:
    data = _owned_document(owner_id, document_id)
    content = firebase_service.get_storage_bucket().blob(data['storagePath']).download_as_bytes()
    return content, data.get('title', 'document.pdf')


def delete_document(owner_id: str, document_id: str) -> None:
    data = _owned_document(owner_id, document_id)
    bucket = firebase_service.get_storage_bucket()
    for path in (data.get('textPath'), data.get('storagePath')):
        if not path:
            continue
        try:
            bucket.blob(path).delete()
        except NotFound:
            continue

    database = firebase_service.get_firestore()
    chat_sessions = database.collection('chat_sessions').where('ownerId', '==', owner_id).where('documentId', '==', document_id).stream()
    for session in chat_sessions:
        session_ref = session.reference
        for message in session_ref.collection('messages').stream():
            message.reference.delete()
        session_ref.delete()

    for collection_name in ('notes',):
        records = database.collection(collection_name).where('ownerId', '==', owner_id).where('documentId', '==', document_id).stream()
        for record in records:
            record.reference.delete()

    for collection_name in ('extracted_data', 'mind_maps'):
        record_ref = database.collection(collection_name).document(document_id)
        record = record_ref.get()
        if record.exists and (record.to_dict() or {}).get('ownerId') == owner_id:
            record_ref.delete()

    database.collection('documents').document(document_id).delete()


def list_chat_sessions(owner_id: str) -> list[dict[str, Any]]:
    records = firebase_service.get_firestore().collection('chat_sessions').where('ownerId', '==', owner_id).stream()
    sessions = []
    for record in records:
        data = record.to_dict() or {}
        updated_at = data.get('updatedAt')
        sessions.append({
            'id': record.id,
            'documentId': data.get('documentId'),
            'title': data.get('title', 'Document chat'),
            'updatedAt': updated_at.isoformat() if hasattr(updated_at, 'isoformat') else updated_at,
        })
    return sorted(sessions, key=lambda item: item.get('updatedAt') or '', reverse=True)


def save_chat_exchange(
    owner_id: str,
    document_id: str,
    question: str,
    answer: str,
    chat_session_id: str | None = None,
) -> str:
    _owned_document(owner_id, document_id)
    database = firebase_service.get_firestore()
    sessions = database.collection('chat_sessions')
    session_id = chat_session_id or str(uuid4())
    session_ref = sessions.document(session_id)
    existing = session_ref.get()
    if existing.exists:
        session_data = existing.to_dict() or {}
        if session_data.get('ownerId') != owner_id or session_data.get('documentId') != document_id:
            raise DocumentNotFoundError(session_id)
    else:
        session_ref.set({
            'ownerId': owner_id,
            'documentId': document_id,
            'title': question[:80],
            'createdAt': datetime.now(timezone.utc),
        })

    timestamp = datetime.now(timezone.utc)
    messages = session_ref.collection('messages')
    messages.add({'ownerId': owner_id, 'role': 'user', 'content': question, 'createdAt': timestamp})
    messages.add({'ownerId': owner_id, 'role': 'assistant', 'content': answer, 'createdAt': timestamp})
    session_ref.update({'updatedAt': timestamp})
    return session_id


def list_chat_messages(owner_id: str, chat_session_id: str) -> list[dict[str, Any]]:
    session_ref = firebase_service.get_firestore().collection('chat_sessions').document(chat_session_id)
    session = session_ref.get()
    data = session.to_dict()
    if not session.exists or not data or data.get('ownerId') != owner_id:
        raise DocumentNotFoundError(chat_session_id)

    messages = []
    for message in session_ref.collection('messages').order_by('createdAt').stream():
        item = message.to_dict() or {}
        created_at = item.get('createdAt')
        messages.append({
            'id': message.id,
            'role': item.get('role'),
            'content': item.get('content', ''),
            'createdAt': created_at.isoformat() if hasattr(created_at, 'isoformat') else created_at,
        })
    return messages


def list_notes(owner_id: str) -> list[dict[str, Any]]:
    records = firebase_service.get_firestore().collection('notes').where('ownerId', '==', owner_id).stream()
    notes = []
    for record in records:
        data = record.to_dict() or {}
        updated_at = data.get('updatedAt')
        notes.append({
            'id': record.id,
            'documentId': data.get('documentId'),
            'title': data.get('title', 'Document notes'),
            'body': data.get('body', ''),
            'updatedAt': updated_at.isoformat() if hasattr(updated_at, 'isoformat') else updated_at,
        })
    return sorted(notes, key=lambda item: item.get('updatedAt') or '', reverse=True)


def save_notes(owner_id: str, document_id: str, body: str) -> dict[str, Any]:
    document = _owned_document(owner_id, document_id)
    timestamp = datetime.now(timezone.utc)
    note_ref = firebase_service.get_firestore().collection('notes').document()
    note_ref.set({
        'ownerId': owner_id,
        'documentId': document_id,
        'title': f"Notes: {document.get('title', 'Document')}",
        'body': body,
        'createdAt': timestamp,
        'updatedAt': timestamp,
    })
    return {
        'id': note_ref.id,
        'documentId': document_id,
        'title': f"Notes: {document.get('title', 'Document')}",
        'body': body,
        'updatedAt': timestamp.isoformat(),
    }


def get_extracted_data(owner_id: str, document_id: str) -> dict[str, Any] | None:
    _owned_document(owner_id, document_id)
    snapshot = firebase_service.get_firestore().collection('extracted_data').document(document_id).get()
    data = snapshot.to_dict()
    if not snapshot.exists or not data or data.get('ownerId') != owner_id:
        return None
    updated_at = data.get('updatedAt')
    return {
        'documentId': document_id,
        'data': data.get('data', {}),
        'updatedAt': updated_at.isoformat() if hasattr(updated_at, 'isoformat') else updated_at,
    }


def save_extracted_data(owner_id: str, document_id: str, extracted: dict[str, Any]) -> dict[str, Any]:
    document = _owned_document(owner_id, document_id)
    timestamp = datetime.now(timezone.utc)
    firebase_service.get_firestore().collection('extracted_data').document(document_id).set({
        'ownerId': owner_id,
        'documentId': document_id,
        'documentTitle': document.get('title', 'Document'),
        'data': extracted,
        'updatedAt': timestamp,
    })
    return {'documentId': document_id, 'data': extracted, 'updatedAt': timestamp.isoformat()}


def get_mind_map(owner_id: str, document_id: str) -> dict[str, Any] | None:
    _owned_document(owner_id, document_id)
    snapshot = firebase_service.get_firestore().collection('mind_maps').document(document_id).get()
    data = snapshot.to_dict()
    if not snapshot.exists or not data or data.get('ownerId') != owner_id:
        return None
    updated_at = data.get('updatedAt')
    return {
        'documentId': document_id,
        'root': data.get('root'),
        'updatedAt': updated_at.isoformat() if hasattr(updated_at, 'isoformat') else updated_at,
    }


def save_mind_map(owner_id: str, document_id: str, root: dict[str, Any]) -> dict[str, Any]:
    document = _owned_document(owner_id, document_id)
    timestamp = datetime.now(timezone.utc)
    firebase_service.get_firestore().collection('mind_maps').document(document_id).set({
        'ownerId': owner_id,
        'documentId': document_id,
        'documentTitle': document.get('title', 'Document'),
        'root': root,
        'updatedAt': timestamp,
    })
    return {'documentId': document_id, 'root': root, 'updatedAt': timestamp.isoformat()}

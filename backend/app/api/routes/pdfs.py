from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.logging import logger
from app.services.pdf.document_service import (
    DocumentNotFoundError,
    delete_document,
    download_document,
    list_documents,
    search_documents,
    store_document,
)

router = APIRouter(prefix='/pdfs', tags=['pdfs'])


@router.get('')
def list_pdfs(current_user: dict = Depends(get_current_user)) -> dict[str, list[object]]:
    try:
        return {'data': list_documents(current_user['uid'])}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='PDF storage is not configured') from exc
    except Exception as exc:
        logger.exception('PDF listing failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load documents') from exc


@router.get('/search')
def search_pdfs(
    q: str | None = None,
    current_user: dict = Depends(get_current_user),
) -> dict[str, list[dict[str, object]]]:
    query = (q or '').strip()
    try:
        return {'data': search_documents(current_user['uid'], query)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='PDF search is not configured') from exc
    except Exception as exc:
        logger.exception('PDF search failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not search your PDFs') from exc


@router.post('/upload')
def upload_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    if file.content_type not in {'application/pdf', 'application/octet-stream'}:
        raise HTTPException(status_code=400, detail='unsupported file type')

    contents = file.file.read(settings.max_upload_size_mb * 1024 * 1024 + 1)
    if len(contents) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail='file too large')
    try:
        document = store_document(current_user['uid'], file.filename or 'document.pdf', contents)
    except ValueError as exc:
        logger.warning('Upload validation failed: %s', exc)
        message = str(exc)
        status_code = 413 if message == 'file too large' else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='PDF storage is not configured') from exc
    except Exception as exc:
        logger.exception('PDF upload failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='PDF upload failed') from exc

    return {'status': 'success', 'document': document}


@router.get('/{document_id}/download')
def open_pdf(document_id: str, current_user: dict = Depends(get_current_user)) -> Response:
    try:
        content, filename = download_document(current_user['uid'], document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='PDF storage is not configured') from exc
    except Exception as exc:
        logger.exception('PDF download failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not open this PDF') from exc

    safe_filename = filename.replace('"', '')
    return Response(content=content, media_type='application/pdf', headers={
        'Content-Disposition': f'inline; filename="{safe_filename}"'
    })


@router.delete('/{document_id}')
def delete_pdf(document_id: str, current_user: dict = Depends(get_current_user)) -> dict[str, str]:
    try:
        delete_document(current_user['uid'], document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='PDF storage is not configured') from exc
    except Exception as exc:
        logger.exception('PDF deletion failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not delete this PDF') from exc
    return {'status': 'success', 'message': 'Document deleted'}

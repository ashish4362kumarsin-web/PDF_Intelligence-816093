from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import NotesRequest
from app.services.ai.gemini_service import gemini_service
from app.services.pdf.document_service import (
    DocumentNotFoundError,
    get_document_text,
    list_notes as fetch_notes,
    save_notes,
)

router = APIRouter(prefix='/notes', tags=['notes'])


@router.get('')
def get_notes(current_user: dict = Depends(get_current_user)) -> dict[str, list[object]]:
    try:
        return {'data': fetch_notes(current_user['uid'])}
    except Exception as exc:
        logger.exception('Notes listing failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load notes') from exc


@router.post('/generate')
def generate_notes(
    payload: NotesRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    if not settings.gemini_configured:
        raise HTTPException(status_code=503, detail='AI service is not configured')

    try:
        document_text = get_document_text(current_user['uid'], payload.document_id)
        notes = gemini_service.generate_notes(document_text)
        saved_note = save_notes(current_user['uid'], payload.document_id, notes['notes'])
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception('Notes generation failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Notes could not be generated') from exc
    except Exception as exc:
        logger.exception('Notes processing failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not generate notes') from exc

    return {'status': 'success', 'note': saved_note}

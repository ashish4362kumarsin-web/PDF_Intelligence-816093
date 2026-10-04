from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import MindMapRequest
from app.services.ai.gemini_service import gemini_service
from app.services.pdf.document_service import (
    DocumentNotFoundError,
    get_document_text,
    get_mind_map as fetch_mind_map,
    save_mind_map,
)

router = APIRouter(prefix='/mind-map', tags=['mind-map'])


@router.get('/{document_id}')
def get_mind_map(
    document_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    try:
        return {'data': fetch_mind_map(current_user['uid'], document_id)}
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except Exception as exc:
        logger.exception('Mind map loading failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load mind map') from exc


@router.post('/generate')
def generate_mind_map(
    payload: MindMapRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    if not settings.gemini_configured:
        raise HTTPException(status_code=503, detail='AI service is not configured')

    try:
        text = get_document_text(current_user['uid'], payload.document_id)
        generated = gemini_service.generate_mind_map(text)
        result = save_mind_map(current_user['uid'], payload.document_id, generated['root'])
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception('Mind map generation failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Mind map could not be generated') from exc
    except Exception as exc:
        logger.exception('Mind map processing failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not generate mind map') from exc

    return {'status': 'success', 'result': result}

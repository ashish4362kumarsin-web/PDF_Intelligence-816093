from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import ExtractedDataRequest
from app.services.ai.gemini_service import gemini_service
from app.services.pdf.document_service import (
    DocumentNotFoundError,
    get_document_text,
    get_extracted_data as fetch_extracted_data,
    save_extracted_data,
)

router = APIRouter(prefix='/extracted-data', tags=['extracted-data'])


@router.get('/{document_id}')
def get_extracted_data(
    document_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    try:
        return {'data': fetch_extracted_data(current_user['uid'], document_id)}
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except Exception as exc:
        logger.exception('Extracted data loading failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load extracted data') from exc


@router.post('/generate')
def generate_extracted_data(
    payload: ExtractedDataRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    if not settings.gemini_configured:
        raise HTTPException(status_code=503, detail='AI service is not configured')

    try:
        text = get_document_text(current_user['uid'], payload.document_id)
        extracted = gemini_service.extract_key_facts(text)
        result = save_extracted_data(current_user['uid'], payload.document_id, extracted)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document not found') from exc
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception('Data extraction failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Document data could not be extracted') from exc
    except Exception as exc:
        logger.exception('Data extraction failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not extract document data') from exc

    return {'status': 'success', 'result': result}

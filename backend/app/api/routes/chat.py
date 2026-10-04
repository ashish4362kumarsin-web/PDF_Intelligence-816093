from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import ChatRequest
from app.services.ai.gemini_service import gemini_service
from app.services.pdf.document_service import (
    DocumentNotFoundError,
    get_document_text,
    list_chat_messages as fetch_chat_messages,
    list_chat_sessions as fetch_chat_sessions,
    save_chat_exchange,
)
from app.services.pdf.pdf_service import select_relevant_context

router = APIRouter(prefix='/chat', tags=['chat'])


@router.get('')
def list_chat_sessions(current_user: dict = Depends(get_current_user)) -> dict[str, list[object]]:
    try:
        return {'data': fetch_chat_sessions(current_user['uid'])}
    except Exception as exc:
        logger.exception('Chat history loading failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load chat history') from exc


@router.get('/{chat_session_id}/messages')
def list_chat_messages(
    chat_session_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict[str, list[dict]]:
    try:
        return {'data': fetch_chat_messages(current_user['uid'], chat_session_id)}
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Chat session not found') from exc
    except Exception as exc:
        logger.exception('Chat messages loading failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load chat messages') from exc


@router.post('')
def send_message(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    if not settings.gemini_configured:
        raise HTTPException(status_code=503, detail='AI service is not configured')

    try:
        document_text = get_document_text(current_user['uid'], payload.document_id)
        context = select_relevant_context(document_text, payload.message)
        answer = gemini_service.generate_response(
            'Answer the user question using only the provided document excerpts. If they do not contain the answer, say so clearly. Cite page numbers only if present in the source excerpts.\n\nQuestion: '
            + payload.message,
            context,
        )
        session_id = save_chat_exchange(
            current_user['uid'],
            payload.document_id,
            payload.message,
            answer,
            payload.chat_session_id,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail='Document or chat session not found') from exc
    except RuntimeError as exc:
        logger.exception('AI chat failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='AI response could not be generated') from exc
    except Exception as exc:
        logger.exception('Document chat failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not complete this chat request') from exc

    return {'message': answer, 'chat_session_id': session_id}

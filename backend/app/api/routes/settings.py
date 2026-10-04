from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.logging import logger
from app.schemas.common import SettingsPayload
from app.services.firebase.user_data_service import get_user_settings, update_user_settings

router = APIRouter(prefix='/settings', tags=['settings'])


@router.get('')
def get_settings(current_user: dict = Depends(get_current_user)) -> dict[str, object]:
    try:
        return {'data': get_user_settings(current_user['uid'])}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='Settings storage is not configured') from exc
    except Exception as exc:
        logger.exception('Settings load failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not load settings') from exc


@router.put('')
def update_settings(
    payload: SettingsPayload,
    current_user: dict = Depends(get_current_user),
) -> dict[str, object]:
    if payload.theme is None and payload.notifications_enabled is None:
        raise HTTPException(status_code=400, detail='No settings provided')

    try:
        return {'status': 'success', 'data': update_user_settings(current_user['uid'], payload)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail='Settings storage is not configured') from exc
    except Exception as exc:
        logger.exception('Settings update failed for user %s', current_user['uid'])
        raise HTTPException(status_code=502, detail='Could not save settings') from exc

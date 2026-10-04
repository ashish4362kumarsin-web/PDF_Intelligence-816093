from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.schemas.common import SettingsPayload
from app.services.firebase.firebase_service import firebase_service


def get_user_settings(owner_id: str) -> dict[str, Any]:
    snapshot = firebase_service.get_firestore().collection('user_settings').document(owner_id).get()
    data = snapshot.to_dict() if snapshot.exists else None
    return {
        'theme': (data or {}).get('theme', 'system'),
        'notifications_enabled': (data or {}).get('notifications_enabled', True),
    }


def update_user_settings(owner_id: str, payload: SettingsPayload) -> dict[str, Any]:
    values = payload.model_dump(exclude_none=True)
    values['updatedAt'] = datetime.now(timezone.utc)
    firebase_service.get_firestore().collection('user_settings').document(owner_id).set(values, merge=True)
    return {key: value for key, value in values.items() if key != 'updatedAt'}

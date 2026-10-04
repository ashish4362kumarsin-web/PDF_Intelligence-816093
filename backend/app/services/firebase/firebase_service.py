from __future__ import annotations

from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore, storage

from app.core.config import settings
from app.core.logging import logger


class FirebaseService:
    def __init__(self) -> None:
        self.app = None
        if settings.firebase_configured:
            try:
                cred = credentials.Certificate({
                    'type': 'service_account',
                    'project_id': settings.firebase_project_id,
                    'private_key': settings.firebase_private_key.replace('\\n', '\n'),
                    'client_email': settings.firebase_client_email,
                })
                options = {'storageBucket': settings.firebase_storage_bucket} if settings.firebase_storage_bucket else None
                firebase_admin.initialize_app(cred, options=options)
                self.app = firebase_admin.get_app()
                logger.info('Firebase Admin SDK initialized successfully')
            except Exception as exc:  # pragma: no cover - runtime config guard
                logger.exception('Firebase initialization failed: %s', exc)
                self.app = None
        else:
            logger.warning('Firebase configuration is incomplete; Firestore and Storage features are disabled.')

    def get_firestore(self) -> Any:
        if self.app is None:
            raise RuntimeError('Firebase is not configured')
        return firestore.client(app=self.app)

    def get_storage_bucket(self) -> Any:
        if self.app is None or not settings.firebase_storage_bucket:
            raise RuntimeError('Firebase Storage is not configured')
        return storage.bucket(app=self.app)


firebase_service = FirebaseService()

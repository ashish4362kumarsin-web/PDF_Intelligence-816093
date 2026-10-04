from __future__ import annotations

from uuid import uuid4

from typing import Literal

from pydantic import BaseModel, Field


class ApiMessage(BaseModel):
    status: str = 'success'
    message: str


class HealthResponse(BaseModel):
    status: str = 'ok'
    service: str = 'pdf-intelligence-api'


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    document_id: str
    chat_session_id: str | None = None


class NotesRequest(BaseModel):
    document_id: str
    scope: str = 'summary'


class SettingsPayload(BaseModel):
    theme: Literal['light', 'dark', 'system'] | None = None
    notifications_enabled: bool | None = None


class ExtractedDataResponse(BaseModel):
    headings: list[str] = Field(default_factory=list)
    names: list[str] = Field(default_factory=list)
    dates: list[str] = Field(default_factory=list)
    numbers: list[str] = Field(default_factory=list)
    key_facts: list[str] = Field(default_factory=list)
    terms: list[str] = Field(default_factory=list)


class ExtractedDataRequest(BaseModel):
    document_id: str


class MindMapRequest(BaseModel):
    document_id: str


class MindMapNodeResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str = Field(..., min_length=1, max_length=300)
    children: list[MindMapNodeResponse] = Field(default_factory=list)


class MindMapResponse(BaseModel):
    root: MindMapNodeResponse

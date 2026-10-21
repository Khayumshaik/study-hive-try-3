from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    group_id: UUID
    created_by: UUID

class NoteResponse(BaseModel):
    id: UUID
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    group_id: UUID
    created_by: UUID
    created_at: datetime
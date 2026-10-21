from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class StudyGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    subject: str
    created_by: UUID

class StudyGroupResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    subject: str
    created_by: UUID
    created_at: datetime
from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID
from app.core.supabase import supabase
from app.schemas.note import NoteCreate, NoteResponse

router = APIRouter()

@router.post("/", response_model=NoteResponse)
async def create_note(note: NoteCreate):
    response = supabase.table("notes").insert(note.model_dump(mode="json")).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create note")
    return response.data[0]

@router.get("/group/{group_id}", response_model=List[NoteResponse])
async def list_notes_by_group(group_id: UUID):
    response = supabase.table("notes").select("*").eq("group_id", str(group_id)).execute()
    return response.data
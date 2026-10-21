from fastapi import APIRouter, HTTPException
from typing import List
from app.core.supabase import supabase
from app.schemas.group import StudyGroupCreate, StudyGroupResponse

router = APIRouter()

@router.post("/", response_model=StudyGroupResponse)
async def create_study_group(group: StudyGroupCreate):
    response = supabase.table("study_groups").insert(group.model_dump(mode="json")).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create study group")
    return response.data[0]

@router.get("/", response_model=List[StudyGroupResponse])
async def list_study_groups():
    response = supabase.table("study_groups").select("*").execute()
    return response.data
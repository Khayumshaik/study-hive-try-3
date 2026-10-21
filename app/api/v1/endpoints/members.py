from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from uuid import UUID
from app.core.supabase import supabase

router = APIRouter()

class MemberJoin(BaseModel):
    group_id: UUID
    user_id: UUID

@router.post("/join")
async def join_group(member: MemberJoin):
    response = supabase.table("group_members").insert(member.model_dump(mode="json")).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to join group")
    return {"message": "Successfully joined group", "data": response.data[0]}

@router.get("/group/{group_id}")
async def list_group_members(group_id: UUID):
    response = supabase.table("group_members").select("*").eq("group_id", str(group_id)).execute()
    return response.data
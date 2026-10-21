from fastapi import APIRouter
from app.api.v1.endpoints import groups, notes, members
api_router = APIRouter()

@api_router.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "healthy", "service": "StudyHive API"}

api_router.include_router(groups.router, prefix="/groups", tags=["Study Groups"])
api_router.include_router(notes.router, prefix="/notes", tags=["Notes & Resources"])
api_router.include_router(members.router, prefix="/members", tags=["Group Members"])
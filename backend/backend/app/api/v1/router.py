from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "healthy", "service": "StudyHive API"}
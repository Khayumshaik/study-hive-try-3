import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List

# Explicitly load .env file from the project root
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Study Hive"
    API_V1_STR: str = "/api/v1"
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
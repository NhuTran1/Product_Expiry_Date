from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost:3306/smart_expiration_db?charset=utf8mb4"
    )
    app_host: str = os.getenv("APP_HOST", "http://127.0.0.1:8000")
    near_expiry_days: int = int(os.getenv("NEAR_EXPIRY_DAYS", "30"))
    phash_auto_threshold: int = int(os.getenv("PHASH_AUTO_THRESHOLD", "6"))
    phash_suggest_threshold: int = int(os.getenv("PHASH_SUGGEST_THRESHOLD", "10"))

settings = Settings()
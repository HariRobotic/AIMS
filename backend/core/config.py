from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "AI Autonomous Monitoring System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./anomaly_monitor.db"

    # Storage
    UPLOAD_DIR: Path = Path("uploads")
    FRAMES_DIR: Path = Path("frames")
    HEATMAPS_DIR: Path = Path("heatmaps")
    MODELS_DIR: Path = Path("models")

    # Anomalib
    ANOMALIB_MODEL: str = "padim"  # padim, patchcore, efficient_ad, etc.
    ANOMALY_THRESHOLD: float = 0.5
    MAX_FRAME_DIMENSION: int = 512

    # Upload limits
    MAX_IMAGE_SIZE_MB: int = 20
    MAX_VIDEO_SIZE_MB: int = 500
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/bmp", "image/tiff"]
    ALLOWED_VIDEO_TYPES: list = ["video/mp4", "video/avi", "video/mov", "video/mkv"]

    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure directories exist
for d in [settings.UPLOAD_DIR, settings.FRAMES_DIR, settings.HEATMAPS_DIR, settings.MODELS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

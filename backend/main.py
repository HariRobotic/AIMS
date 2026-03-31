"""
AI Autonomous Monitoring System – FastAPI Backend
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from models.database import init_db, AsyncSessionLocal, User
from services.auth import hash_password
from api.auth import router as auth_router
from api.detections import router as detection_router
from api.analytics import router as analytics_router
from api.admin import admin_router, stream_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_admin():
    """Create a default admin user on first run."""
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalar_one_or_none():
            admin = User(
                email="admin@anomalymonitor.local",
                username="Admin",
                hashed_password=hash_password("Admin@123"),
                full_name="System Administrator",
                is_admin=True,
            )
            db.add(admin)
            await db.commit()
            # logger.info("Default admin created: admin / admin1234")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up…")
    await init_db()
    await seed_admin()
    yield
    logger.info("Shutting down…")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-powered anomaly detection platform using Anomalib",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving (heatmaps / frames / uploads)
app.mount("/static/heatmaps", StaticFiles(directory=str(settings.HEATMAPS_DIR)), name="heatmaps")
app.mount("/static/frames", StaticFiles(directory=str(settings.FRAMES_DIR)), name="frames")
app.mount("/static/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Routers
app.include_router(auth_router, prefix="/api")
app.include_router(detection_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(stream_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}


@app.get("/api/models")
async def available_models():
    return {
        "models": [
            {"id": "padim", "name": "PaDiM", "description": "Patch Distribution Modeling – fast and accurate"},
            {"id": "patchcore", "name": "PatchCore", "description": "Memory-bank patch anomaly detection"},
            {"id": "efficient_ad", "name": "EfficientAD", "description": "Lightweight student-teacher model"},
            {"id": "fastflow", "name": "FastFlow", "description": "Normalizing flow-based detection"},
            {"id": "reverse_distillation", "name": "Reverse Distillation", "description": "Teacher-student with reverse architecture"},
        ]
    }

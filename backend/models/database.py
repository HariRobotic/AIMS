from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.ext.asyncio import async_sessionmaker
from core.config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    uploads = relationship("UploadRecord", back_populates="owner")
    detection_jobs = relationship("DetectionJob", back_populates="owner")


class UploadRecord(Base):
    __tablename__ = "upload_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # "image" or "video"
    mime_type = Column(String(100))
    file_size = Column(Integer)  # bytes
    file_path = Column(String(1000), nullable=False)
    duration_seconds = Column(Float, nullable=True)  # for videos
    frame_count = Column(Integer, nullable=True)  # for videos
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="uploaded")  # uploaded, processing, processed, error

    owner = relationship("User", back_populates="uploads")
    detection_jobs = relationship("DetectionJob", back_populates="upload")


class DetectionJob(Base):
    __tablename__ = "detection_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_id = Column(Integer, ForeignKey("upload_records.id"), nullable=True)
    job_type = Column(String(50), nullable=False)  # "image", "video", "stream"
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    model_name = Column(String(100), default="padim")
    anomaly_threshold = Column(Float, default=0.5)
    total_frames = Column(Integer, default=0)
    processed_frames = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    average_score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    job_metadata = Column(JSON, nullable=True)

    owner = relationship("User", back_populates="detection_jobs")
    upload = relationship("UploadRecord", back_populates="detection_jobs")
    results = relationship("DetectionResult", back_populates="job")


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("detection_jobs.id"), nullable=False)
    frame_number = Column(Integer, default=0)
    frame_path = Column(String(1000), nullable=True)
    heatmap_path = Column(String(1000), nullable=True)
    anomaly_score = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, default=False)
    anomaly_map = Column(JSON, nullable=True)  # compressed anomaly map data
    bounding_boxes = Column(JSON, nullable=True)  # detected anomaly regions
    timestamp_ms = Column(Float, nullable=True)  # for video frames
    detected_at = Column(DateTime, default=datetime.utcnow)
    job_metadata = Column(JSON, nullable=True)

    job = relationship("DetectionJob", back_populates="results")


class CameraStream(Base):
    __tablename__ = "camera_streams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    url = Column(String(1000), nullable=False)  # RTSP or HTTP stream URL
    is_active = Column(Boolean, default=False)
    sampling_interval_ms = Column(Integer, default=1000)  # ms between captures
    created_at = Column(DateTime, default=datetime.utcnow)
    last_captured_at = Column(DateTime, nullable=True)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

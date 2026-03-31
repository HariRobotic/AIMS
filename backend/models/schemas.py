from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Uploads ─────────────────────────────────────────────────────────────────

class UploadOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    mime_type: Optional[str]
    file_size: Optional[int]
    duration_seconds: Optional[float]
    frame_count: Optional[int]
    width: Optional[int]
    height: Optional[int]
    uploaded_at: datetime
    status: str

    class Config:
        from_attributes = True


# ─── Detection Jobs ───────────────────────────────────────────────────────────

class DetectionJobCreate(BaseModel):
    upload_id: int
    model_name: str = "padim"
    anomaly_threshold: float = Field(0.5, ge=0.0, le=1.0)


class DetectionJobOut(BaseModel):
    id: int
    upload_id: Optional[int]
    job_type: str
    status: str
    model_name: str
    anomaly_threshold: float
    total_frames: int
    processed_frames: int
    anomaly_count: int
    average_score: Optional[float]
    max_score: Optional[float]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DetectionResultOut(BaseModel):
    id: int
    job_id: int
    frame_number: int
    frame_path: Optional[str]
    heatmap_path: Optional[str]
    anomaly_score: float
    is_anomaly: bool
    bounding_boxes: Optional[list]
    timestamp_ms: Optional[float]
    detected_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ───────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_jobs: int
    total_frames_processed: int
    total_anomalies_detected: int
    anomaly_rate: float
    average_score: float
    jobs_by_status: dict
    recent_activity: List[dict]


class TimeSeriesPoint(BaseModel):
    timestamp: str
    anomaly_count: int
    average_score: float
    total_frames: int


# ─── Camera Streams ───────────────────────────────────────────────────────────

class StreamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    url: str
    sampling_interval_ms: int = Field(1000, ge=100, le=30000)


class StreamOut(BaseModel):
    id: int
    name: str
    url: str
    is_active: bool
    sampling_interval_ms: int
    created_at: datetime
    last_captured_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Admin ───────────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class SystemStats(BaseModel):
    total_users: int
    active_users: int
    total_uploads: int
    total_jobs: int
    total_results: int
    disk_usage_mb: float
    models_available: List[str]

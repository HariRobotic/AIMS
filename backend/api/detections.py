import asyncio
import uuid
from pathlib import Path
from typing import List, Optional

import cv2
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from core.config import settings
from models.database import DetectionJob, DetectionResult, UploadRecord, User, get_db
from models.schemas import DetectionJobCreate, DetectionJobOut, DetectionResultOut, UploadOut
from services.auth import get_current_user
from services.detection import process_detection_job

router = APIRouter(prefix="/detections", tags=["Detections"])


# ─── Upload ───────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content_type = file.content_type or ""
    is_image = content_type in settings.ALLOWED_IMAGE_TYPES
    is_video = content_type in settings.ALLOWED_VIDEO_TYPES

    if not is_image and not is_video:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: images and videos.",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    limit = settings.MAX_IMAGE_SIZE_MB if is_image else settings.MAX_VIDEO_SIZE_MB
    if size_mb > limit:
        raise HTTPException(status_code=413, detail=f"File exceeds {limit} MB limit")

    ext = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    dest_path = settings.UPLOAD_DIR / unique_name
    with open(dest_path, "wb") as f:
        f.write(content)

    file_type = "image" if is_image else "video"
    width = height = duration = frame_count = None

    if is_image:
        import numpy as np
        arr = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
        if arr is not None:
            height, width = arr.shape[:2]
    elif is_video:
        cap = cv2.VideoCapture(str(dest_path))
        if cap.isOpened():
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 25
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps
            cap.release()

    record = UploadRecord(
        user_id=current_user.id,
        filename=unique_name,
        original_filename=file.filename,
        file_type=file_type,
        mime_type=content_type,
        file_size=len(content),
        file_path=str(dest_path),
        duration_seconds=duration,
        frame_count=frame_count,
        width=width,
        height=height,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


# ─── Jobs ─────────────────────────────────────────────────────────────────────

@router.post("/jobs", response_model=DetectionJobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: DetectionJobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify upload ownership
    up = await db.execute(
        select(UploadRecord).where(
            UploadRecord.id == payload.upload_id,
            UploadRecord.user_id == current_user.id,
        )
    )
    upload = up.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    job = DetectionJob(
        user_id=current_user.id,
        upload_id=payload.upload_id,
        job_type=upload.file_type,
        model_name=payload.model_name,
        anomaly_threshold=payload.anomaly_threshold,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_detection_job, job.id)
    return job


@router.get("/jobs", response_model=List[DetectionJobOut])
async def list_jobs(
    skip: int = 0,
    limit: int = Query(20, le=500),
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(DetectionJob).where(DetectionJob.user_id == current_user.id)
    if status_filter:
        q = q.where(DetectionJob.status == status_filter)
    q = q.order_by(DetectionJob.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/jobs/{job_id}", response_model=DetectionJobOut)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DetectionJob).where(
            DetectionJob.id == job_id,
            DetectionJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs/{job_id}/results", response_model=List[DetectionResultOut])
async def get_job_results(
    job_id: int,
    skip: int = 0,
    limit: int = Query(500, le=1000),
    anomalies_only: str = Query("false"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_r = await db.execute(
        select(DetectionJob).where(
            DetectionJob.id == job_id,
            DetectionJob.user_id == current_user.id,
        )
    )
    if not job_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    q = select(DetectionResult).where(DetectionResult.job_id == job_id)
    if str(anomalies_only).lower() in ("true", "1", "yes"):
        q = q.where(DetectionResult.is_anomaly == True)
    q = q.order_by(DetectionResult.frame_number).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()

    # Verify job ownership
    job_r = await db.execute(
        select(DetectionJob).where(
            DetectionJob.id == job_id,
            DetectionJob.user_id == current_user.id,
        )
    )
    if not job_r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    q = select(DetectionResult).where(DetectionResult.job_id == job_id)
    if anomalies_only:
        q = q.where(DetectionResult.is_anomaly == True)
    q = q.order_by(DetectionResult.frame_number).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


# ─── Uploads list ─────────────────────────────────────────────────────────────

@router.get("/uploads", response_model=List[UploadOut])
async def list_uploads(
    skip: int = 0,
    limit: int = Query(20, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(UploadRecord)
        .where(UploadRecord.user_id == current_user.id)
        .order_by(UploadRecord.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(q)
    return result.scalars().all()

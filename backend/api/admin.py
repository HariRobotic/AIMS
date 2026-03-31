import os
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.database import CameraStream, DetectionJob, DetectionResult, UploadRecord, User, get_db
from models.schemas import StreamCreate, StreamOut, SystemStats, UserOut, UserUpdate
from services.auth import get_admin_user, get_current_user

admin_router = APIRouter(prefix="/admin", tags=["Admin"])
stream_router = APIRouter(prefix="/streams", tags=["Camera Streams"])
data_router = APIRouter(prefix="/data", tags=["Data Management"])

AVAILABLE_MODELS = ["padim", "patchcore", "efficient_ad", "fastflow", "reverse_distillation"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _delete_file_safe(path_str: Optional[str]):
    """Delete a file from disk silently if it exists."""
    if not path_str:
        return
    try:
        p = Path(path_str.replace("\\", "/"))
        if p.exists():
            p.unlink()
    except Exception:
        pass


async def _delete_user_data(db: AsyncSession, user_id: int):
    """
    Delete all uploads, jobs, results, streams for a user.
    Also removes associated files from disk.
    Returns counts of deleted records.
    """
    counts = {"results": 0, "jobs": 0, "uploads": 0, "streams": 0, "files_deleted": 0}

    # Get all job IDs for this user
    job_rows = await db.execute(
        select(DetectionJob.id).where(DetectionJob.user_id == user_id)
    )
    job_ids = [r[0] for r in job_rows.all()]

    if job_ids:
        # Get all result file paths before deleting
        result_rows = await db.execute(
            select(DetectionResult.heatmap_path, DetectionResult.frame_path)
            .where(DetectionResult.job_id.in_(job_ids))
        )
        for heatmap_path, frame_path in result_rows.all():
            _delete_file_safe(heatmap_path)
            _delete_file_safe(frame_path)
            counts["files_deleted"] += 2

        # Delete results
        r = await db.execute(
            delete(DetectionResult).where(DetectionResult.job_id.in_(job_ids))
        )
        counts["results"] = r.rowcount

        # Delete jobs
        r = await db.execute(
            delete(DetectionJob).where(DetectionJob.user_id == user_id)
        )
        counts["jobs"] = r.rowcount

    # Get upload file paths before deleting
    upload_rows = await db.execute(
        select(UploadRecord.file_path).where(UploadRecord.user_id == user_id)
    )
    for (file_path,) in upload_rows.all():
        _delete_file_safe(file_path)
        counts["files_deleted"] += 1

    # Delete uploads
    r = await db.execute(
        delete(UploadRecord).where(UploadRecord.user_id == user_id)
    )
    counts["uploads"] = r.rowcount

    # Delete streams
    r = await db.execute(
        delete(CameraStream).where(CameraStream.user_id == user_id)
    )
    counts["streams"] = r.rowcount

    await db.commit()
    return counts


# ─── Admin stats ──────────────────────────────────────────────────────────────

@admin_router.get("/stats", response_model=SystemStats)
async def system_stats(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    counts = {}
    for model, key in [
        (User, "total_users"),
        (UploadRecord, "total_uploads"),
        (DetectionJob, "total_jobs"),
        (DetectionResult, "total_results"),
    ]:
        r = await db.execute(select(func.count()).select_from(model))
        counts[key] = r.scalar() or 0

    active_r = await db.execute(select(func.count()).where(User.is_active == True))
    counts["active_users"] = active_r.scalar() or 0

    disk_mb = 0.0
    for d in [settings.UPLOAD_DIR, settings.FRAMES_DIR, settings.HEATMAPS_DIR]:
        if d.exists():
            disk_mb += sum(f.stat().st_size for f in d.rglob("*") if f.is_file()) / (1024 * 1024)

    return SystemStats(
        **counts,
        disk_usage_mb=round(disk_mb, 2),
        models_available=AVAILABLE_MODELS,
    )


@admin_router.get("/users", response_model=List[UserOut])
async def list_users(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.is_admin.desc(), User.created_at))
    return result.scalars().all()


@admin_router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@admin_router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Delete all their data first
    await _delete_user_data(db, user_id)
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    return {"message": "User and all their data deleted"}


@admin_router.get("/models")
async def list_models(_admin: User = Depends(get_admin_user)):
    return {"models": AVAILABLE_MODELS}


# ─── Admin data delete endpoints ──────────────────────────────────────────────

@admin_router.delete("/data/user/{user_id}")
async def admin_delete_user_data(
    user_id: int,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: delete all uploads/jobs/results/streams for a specific user."""
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")
    counts = await _delete_user_data(db, user_id)
    return {"message": f"Deleted all data for user {user_id}", "deleted": counts}


@admin_router.delete("/data/all")
async def admin_delete_all_data(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: wipe ALL data from the entire system (keeps user accounts)."""
    # Delete all result files
    result_rows = await db.execute(
        select(DetectionResult.heatmap_path, DetectionResult.frame_path)
    )
    files_deleted = 0
    for heatmap_path, frame_path in result_rows.all():
        _delete_file_safe(heatmap_path)
        _delete_file_safe(frame_path)
        files_deleted += 2

    # Delete all upload files
    upload_rows = await db.execute(select(UploadRecord.file_path))
    for (file_path,) in upload_rows.all():
        _delete_file_safe(file_path)
        files_deleted += 1

    # Delete DB records
    r1 = await db.execute(delete(DetectionResult))
    r2 = await db.execute(delete(DetectionJob))
    r3 = await db.execute(delete(UploadRecord))
    r4 = await db.execute(delete(CameraStream))
    await db.commit()

    return {
        "message": "All detection data wiped from system",
        "deleted": {
            "results": r1.rowcount,
            "jobs": r2.rowcount,
            "uploads": r3.rowcount,
            "streams": r4.rowcount,
            "files": files_deleted,
        }
    }


@admin_router.delete("/data/jobs")
async def admin_delete_all_jobs(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: delete all detection jobs and results only (keep uploads)."""
    result_rows = await db.execute(
        select(DetectionResult.heatmap_path, DetectionResult.frame_path)
    )
    files_deleted = 0
    for heatmap_path, frame_path in result_rows.all():
        _delete_file_safe(heatmap_path)
        _delete_file_safe(frame_path)
        files_deleted += 2

    r1 = await db.execute(delete(DetectionResult))
    r2 = await db.execute(delete(DetectionJob))
    await db.commit()
    return {"message": "All jobs and results deleted", "deleted": {"results": r1.rowcount, "jobs": r2.rowcount, "files": files_deleted}}


@admin_router.delete("/data/uploads")
async def admin_delete_all_uploads(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: delete all uploaded files (also cascades jobs/results)."""
    result_rows = await db.execute(select(DetectionResult.heatmap_path, DetectionResult.frame_path))
    files_deleted = 0
    for heatmap_path, frame_path in result_rows.all():
        _delete_file_safe(heatmap_path)
        _delete_file_safe(frame_path)
        files_deleted += 2

    upload_rows = await db.execute(select(UploadRecord.file_path))
    for (file_path,) in upload_rows.all():
        _delete_file_safe(file_path)
        files_deleted += 1

    await db.execute(delete(DetectionResult))
    await db.execute(delete(DetectionJob))
    r = await db.execute(delete(UploadRecord))
    await db.commit()
    return {"message": "All uploads and related data deleted", "deleted": {"uploads": r.rowcount, "files": files_deleted}}


# ─── User self-service delete endpoints ───────────────────────────────────────

@data_router.delete("/my/all")
async def user_delete_my_all_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: delete all their own uploads, jobs, results, streams."""
    counts = await _delete_user_data(db, current_user.id)
    return {"message": "All your data has been deleted", "deleted": counts}


@data_router.delete("/my/jobs")
async def user_delete_my_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: delete only their detection jobs and results."""
    job_rows = await db.execute(
        select(DetectionJob.id).where(DetectionJob.user_id == current_user.id)
    )
    job_ids = [r[0] for r in job_rows.all()]
    files_deleted = 0
    if job_ids:
        result_rows = await db.execute(
            select(DetectionResult.heatmap_path, DetectionResult.frame_path)
            .where(DetectionResult.job_id.in_(job_ids))
        )
        for heatmap_path, frame_path in result_rows.all():
            _delete_file_safe(heatmap_path)
            _delete_file_safe(frame_path)
            files_deleted += 2
        await db.execute(delete(DetectionResult).where(DetectionResult.job_id.in_(job_ids)))
        await db.execute(delete(DetectionJob).where(DetectionJob.user_id == current_user.id))
        await db.commit()
    return {"message": "Your detection jobs and results deleted", "deleted": {"jobs": len(job_ids), "files": files_deleted}}


@data_router.delete("/my/uploads")
async def user_delete_my_uploads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: delete all their uploaded files (cascades jobs/results)."""
    job_rows = await db.execute(select(DetectionJob.id).where(DetectionJob.user_id == current_user.id))
    job_ids = [r[0] for r in job_rows.all()]
    files_deleted = 0
    if job_ids:
        result_rows = await db.execute(
            select(DetectionResult.heatmap_path, DetectionResult.frame_path)
            .where(DetectionResult.job_id.in_(job_ids))
        )
        for heatmap_path, frame_path in result_rows.all():
            _delete_file_safe(heatmap_path)
            _delete_file_safe(frame_path)
            files_deleted += 2
        await db.execute(delete(DetectionResult).where(DetectionResult.job_id.in_(job_ids)))
        await db.execute(delete(DetectionJob).where(DetectionJob.user_id == current_user.id))

    upload_rows = await db.execute(
        select(UploadRecord.file_path).where(UploadRecord.user_id == current_user.id)
    )
    for (file_path,) in upload_rows.all():
        _delete_file_safe(file_path)
        files_deleted += 1

    r = await db.execute(delete(UploadRecord).where(UploadRecord.user_id == current_user.id))
    await db.commit()
    return {"message": "Your uploads deleted", "deleted": {"uploads": r.rowcount, "files": files_deleted}}


@data_router.delete("/my/job/{job_id}")
async def user_delete_single_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: delete a single detection job and its results."""
    result = await db.execute(
        select(DetectionJob).where(DetectionJob.id == job_id, DetectionJob.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result_rows = await db.execute(
        select(DetectionResult.heatmap_path, DetectionResult.frame_path)
        .where(DetectionResult.job_id == job_id)
    )
    for heatmap_path, frame_path in result_rows.all():
        _delete_file_safe(heatmap_path)
        _delete_file_safe(frame_path)

    await db.execute(delete(DetectionResult).where(DetectionResult.job_id == job_id))
    await db.execute(delete(DetectionJob).where(DetectionJob.id == job_id))
    await db.commit()
    return {"message": f"Job #{job_id} and its results deleted"}


@data_router.delete("/my/upload/{upload_id}")
async def user_delete_single_upload(
    upload_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: delete a single upload and its associated jobs/results."""
    result = await db.execute(
        select(UploadRecord).where(UploadRecord.id == upload_id, UploadRecord.user_id == current_user.id)
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    _delete_file_safe(upload.file_path)

    job_rows = await db.execute(select(DetectionJob.id).where(DetectionJob.upload_id == upload_id))
    job_ids = [r[0] for r in job_rows.all()]
    if job_ids:
        result_rows = await db.execute(
            select(DetectionResult.heatmap_path, DetectionResult.frame_path)
            .where(DetectionResult.job_id.in_(job_ids))
        )
        for heatmap_path, frame_path in result_rows.all():
            _delete_file_safe(heatmap_path)
            _delete_file_safe(frame_path)
        await db.execute(delete(DetectionResult).where(DetectionResult.job_id.in_(job_ids)))
        await db.execute(delete(DetectionJob).where(DetectionJob.upload_id == upload_id))

    await db.execute(delete(UploadRecord).where(UploadRecord.id == upload_id))
    await db.commit()
    return {"message": f"Upload #{upload_id} and related jobs deleted"}


# ─── Camera Streams ───────────────────────────────────────────────────────────

@stream_router.post("", response_model=StreamOut, status_code=201)
async def create_stream(
    payload: StreamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stream = CameraStream(
        user_id=current_user.id,
        name=payload.name,
        url=payload.url,
        sampling_interval_ms=payload.sampling_interval_ms,
    )
    db.add(stream)
    await db.commit()
    await db.refresh(stream)
    return stream


@stream_router.get("", response_model=List[StreamOut])
async def list_streams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CameraStream)
        .where(CameraStream.user_id == current_user.id)
        .order_by(CameraStream.created_at.desc())
    )
    return result.scalars().all()


@stream_router.delete("/{stream_id}")
async def delete_stream(
    stream_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CameraStream).where(
            CameraStream.id == stream_id,
            CameraStream.user_id == current_user.id,
        )
    )
    stream = result.scalar_one_or_none()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    await db.delete(stream)
    await db.commit()
    return {"message": "Stream deleted"}
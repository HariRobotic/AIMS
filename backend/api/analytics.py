from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import DetectionJob, DetectionResult, UploadRecord, User, get_db
from models.schemas import AnalyticsSummary, TimeSeriesPoint
from services.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.id

    total_jobs_r = await db.execute(
        select(func.count()).where(DetectionJob.user_id == uid)
    )
    total_jobs = total_jobs_r.scalar() or 0

    stats_r = await db.execute(
        select(
            func.sum(DetectionJob.processed_frames),
            func.sum(DetectionJob.anomaly_count),
            func.avg(DetectionJob.average_score),
        ).where(DetectionJob.user_id == uid)
    )
    row = stats_r.one()
    total_frames = int(row[0] or 0)
    total_anomalies = int(row[1] or 0)
    avg_score = float(row[2] or 0.0)
    anomaly_rate = (total_anomalies / total_frames) if total_frames > 0 else 0.0

    status_r = await db.execute(
        select(DetectionJob.status, func.count())
        .where(DetectionJob.user_id == uid)
        .group_by(DetectionJob.status)
    )
    jobs_by_status = {s: c for s, c in status_r.all()}

    recent_r = await db.execute(
        select(DetectionJob)
        .where(DetectionJob.user_id == uid)
        .order_by(DetectionJob.created_at.desc())
        .limit(10)
    )
    recent = []
    for j in recent_r.scalars().all():
        recent.append({
            "id": j.id,
            "job_type": j.job_type,
            "status": j.status,
            "anomaly_count": j.anomaly_count,
            "average_score": j.average_score,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        })

    return AnalyticsSummary(
        total_jobs=total_jobs,
        total_frames_processed=total_frames,
        total_anomalies_detected=total_anomalies,
        anomaly_rate=round(anomaly_rate, 4),
        average_score=round(avg_score, 4),
        jobs_by_status=jobs_by_status,
        recent_activity=recent,
    )


@router.get("/timeseries", response_model=List[TimeSeriesPoint])
async def get_timeseries(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    jobs_r = await db.execute(
        select(DetectionJob)
        .where(
            DetectionJob.user_id == current_user.id,
            DetectionJob.created_at >= since,
            DetectionJob.status == "completed",
        )
        .order_by(DetectionJob.created_at)
    )
    jobs = jobs_r.scalars().all()

    # Bucket by day
    from collections import defaultdict
    buckets: dict = defaultdict(lambda: {"anomaly_count": 0, "scores": [], "total_frames": 0})
    for j in jobs:
        day = j.created_at.strftime("%Y-%m-%d")
        buckets[day]["anomaly_count"] += j.anomaly_count or 0
        buckets[day]["total_frames"] += j.processed_frames or 0
        if j.average_score is not None:
            buckets[day]["scores"].append(j.average_score)

    points = []
    for day in sorted(buckets.keys()):
        b = buckets[day]
        avg = sum(b["scores"]) / len(b["scores"]) if b["scores"] else 0.0
        points.append(TimeSeriesPoint(
            timestamp=day,
            anomaly_count=b["anomaly_count"],
            average_score=round(avg, 4),
            total_frames=b["total_frames"],
        ))
    return points


@router.get("/score-distribution")
async def score_distribution(
    bins: int = Query(20, ge=5, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return histogram data for anomaly score distribution."""
    jobs_r = await db.execute(
        select(DetectionJob.id).where(
            DetectionJob.user_id == current_user.id,
            DetectionJob.status == "completed",
        )
    )
    job_ids = [r[0] for r in jobs_r.all()]
    if not job_ids:
        return {"bins": [], "counts": []}

    results_r = await db.execute(
        select(DetectionResult.anomaly_score).where(
            DetectionResult.job_id.in_(job_ids)
        ).limit(10000)
    )
    scores = [r[0] for r in results_r.all()]
    if not scores:
        return {"bins": [], "counts": []}

    import numpy as np
    counts, edges = np.histogram(scores, bins=bins, range=(0, 1))
    return {
        "bins": [round(float(e), 3) for e in edges[:-1]],
        "counts": counts.tolist(),
    }

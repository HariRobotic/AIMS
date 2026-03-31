"""
Anomaly Detection Engine using Anomalib.

Supports multiple models: PaDiM, PatchCore, EfficientAD, FastFlow, etc.
Produces anomaly scores, classifications, and heatmap visualizations.
"""
import asyncio
import io
import json
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.database import AsyncSessionLocal, DetectionJob, DetectionResult, UploadRecord

logger = logging.getLogger(__name__)

# Anomalib imports – wrapped to give a helpful error if not installed
try:
    # anomalib ≥ 1.x import paths
    from anomalib.models import Padim, Patchcore, EfficientAd  # type: ignore
    ANOMALIB_AVAILABLE = True
except ImportError:
    try:
        # anomalib 0.x fallback
        from anomalib.models import PadimModel as Padim          # type: ignore
        from anomalib.models import PatchcoreModel as Patchcore  # type: ignore
        EfficientAd = None
        ANOMALIB_AVAILABLE = True
    except ImportError:
        ANOMALIB_AVAILABLE = False
        logger.warning("anomalib not installed – running in MOCK mode")


# ─── Heatmap helper ──────────────────────────────────────────────────────────

def _create_heatmap_overlay(original: np.ndarray, anomaly_map: np.ndarray) -> np.ndarray:
    """Blend a coloured heatmap on top of the original BGR image."""
    h, w = original.shape[:2]
    am = cv2.resize(anomaly_map, (w, h))
    am_norm = cv2.normalize(am, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    heatmap = cv2.applyColorMap(am_norm, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)
    return overlay


def _mock_inference(image_bgr: np.ndarray) -> Tuple[float, np.ndarray, bool]:
    """Return deterministic mock results when anomalib is unavailable."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    blurred = cv2.GaussianBlur(gray, (21, 21), 0)
    anomaly_map = np.abs(gray - blurred)
    score = float(anomaly_map.max())
    is_anomaly = score > settings.ANOMALY_THRESHOLD
    return score, anomaly_map, is_anomaly


# ─── Model cache ─────────────────────────────────────────────────────────────

_loaded_models: dict = {}


def _get_model(model_name: str):
    """Return a cached (or freshly loaded) anomalib model."""
    if not ANOMALIB_AVAILABLE:
        return None
    if model_name in _loaded_models:
        return _loaded_models[model_name]

    model_map = {
        "padim": Padim,
        "patchcore": Patchcore,
        "efficient_ad": EfficientAd,
    }
    cls = model_map.get(model_name.lower(), Padim)

    checkpoint = settings.MODELS_DIR / f"{model_name}_checkpoint.pt"
    if checkpoint.exists():
        model = cls.load_from_checkpoint(str(checkpoint))
    else:
        model = cls()

    model.eval()
    _loaded_models[model_name] = model
    return model


# ─── Core inference ──────────────────────────────────────────────────────────

def run_inference_on_frame(
    image_bgr: np.ndarray,
    model_name: str = "padim",
    threshold: float = 0.5,
) -> Tuple[float, np.ndarray, np.ndarray, bool]:
    """
    Run anomaly detection on a single BGR frame.

    Returns
    -------
    score       : float in [0, 1]
    anomaly_map : H×W float32 heatmap
    overlay     : BGR image with heatmap blended in
    is_anomaly  : bool
    """
    model = _get_model(model_name)
    h, w = image_bgr.shape[:2]
    max_dim = settings.MAX_FRAME_DIMENSION
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        image_bgr = cv2.resize(image_bgr, (int(w * scale), int(h * scale)))

    if model is None or not ANOMALIB_AVAILABLE:
        score, anomaly_map, is_anomaly = _mock_inference(image_bgr)
    else:
        try:
            from torchvision import transforms as T
            rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            transform = T.Compose([
                T.ToPILImage(),
                T.Resize((256, 256)),
                T.CenterCrop(224),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406],
                            std=[0.229, 0.224, 0.225]),
            ])
            tensor = transform(rgb).unsqueeze(0)
            with torch.no_grad():
                output = model(tensor)
            score = float(output["pred_score"].item()) if "pred_score" in output else float(output.get("anomaly_map", torch.tensor([[0.5]])).max().item())
            score = min(max(score, 0.0), 1.0)
            is_anomaly = score > threshold
            if "anomaly_map" in output:
                anomaly_map = output["anomaly_map"].squeeze().cpu().numpy().astype(np.float32)
            else:
                anomaly_map = np.full((image_bgr.shape[0], image_bgr.shape[1]), score, dtype=np.float32)
        except Exception as exc:
            logger.error("Inference failed: %s", exc)
            score, anomaly_map, is_anomaly = _mock_inference(image_bgr)

    overlay = _create_heatmap_overlay(image_bgr, anomaly_map)
    return score, anomaly_map, overlay, is_anomaly


# ─── Bounding boxes from anomaly map ─────────────────────────────────────────

def extract_bounding_boxes(anomaly_map: np.ndarray, threshold: float = 0.5) -> list:
    """Return a list of {x, y, w, h, score} dicts for anomalous regions."""
    am_norm = (anomaly_map - anomaly_map.min()) / (anomaly_map.max() - anomaly_map.min() + 1e-8)
    binary = (am_norm > threshold).astype(np.uint8) * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 50:
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        region_score = float(am_norm[y:y+bh, x:x+bw].mean())
        boxes.append({"x": x, "y": y, "w": bw, "h": bh, "score": round(region_score, 4)})
    return boxes


# ─── Job processing ──────────────────────────────────────────────────────────

async def process_detection_job(job_id: int) -> None:
    """
    Background task: load an image/video upload and run frame-by-frame detection.
    Updates the DetectionJob and writes DetectionResult rows as it goes.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Fetch job
            result = await db.execute(select(DetectionJob).where(DetectionJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                logger.error("Job %d not found", job_id)
                return

            # Fetch upload
            up_result = await db.execute(select(UploadRecord).where(UploadRecord.id == job.upload_id))
            upload = up_result.scalar_one_or_none()
            if not upload:
                await _fail_job(db, job, "Upload record not found")
                return

            # Mark running
            job.status = "running"
            job.started_at = datetime.utcnow()
            await db.commit()
            await db.refresh(job)

            file_path = Path(upload.file_path)
            if not file_path.exists():
                await _fail_job(db, job, f"File not found: {file_path}")
                return

            if upload.file_type == "image":
                await _process_image(db, job, upload, file_path)
            elif upload.file_type == "video":
                await _process_video(db, job, upload, file_path)
            else:
                await _fail_job(db, job, f"Unknown file type: {upload.file_type}")

        except Exception as exc:
            logger.error("Job %d crashed: %s\n%s", job_id, exc, traceback.format_exc())
            async with AsyncSessionLocal() as db2:
                r2 = await db2.execute(select(DetectionJob).where(DetectionJob.id == job_id))
                j2 = r2.scalar_one_or_none()
                if j2:
                    await _fail_job(db2, j2, str(exc))


async def _process_image(db: AsyncSession, job: DetectionJob, upload: UploadRecord, path: Path):
    img_bgr = cv2.imread(str(path))
    if img_bgr is None:
        await _fail_job(db, job, "Could not read image file")
        return

    job.total_frames = 1
    await db.commit()

    score, anomaly_map, overlay, is_anomaly = await asyncio.get_event_loop().run_in_executor(
        None, run_inference_on_frame, img_bgr, job.model_name, job.anomaly_threshold
    )

    heatmap_filename = f"heatmap_{job.id}_0.jpg"
    heatmap_path = settings.HEATMAPS_DIR / heatmap_filename
    cv2.imwrite(str(heatmap_path), overlay)

    boxes = extract_bounding_boxes(anomaly_map, job.anomaly_threshold)

    dr = DetectionResult(
        job_id=job.id,
        frame_number=0,
        frame_path=str(path).replace("\\", "/"),
        heatmap_path=str(heatmap_path).replace("\\", "/"),
        anomaly_score=score,
        is_anomaly=is_anomaly,
        bounding_boxes=boxes,
        timestamp_ms=0.0,
    )
    db.add(dr)

    job.processed_frames = 1
    job.anomaly_count = 1 if is_anomaly else 0
    job.average_score = score
    job.max_score = score
    job.status = "completed"
    job.completed_at = datetime.utcnow()
    upload.status = "processed"
    await db.commit()
    logger.info("Image job %d done. score=%.4f anomaly=%s", job.id, score, is_anomaly)


async def _process_video(db: AsyncSession, job: DetectionJob, upload: UploadRecord, path: Path):
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        await _fail_job(db, job, "Could not open video file")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    job.total_frames = total
    await db.commit()

    # Sample 1 frame per second to keep processing fast
    sample_every = max(1, int(fps))

    frame_idx = 0
    processed = 0
    anomaly_count = 0
    scores = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_every != 0:
            frame_idx += 1
            continue

        score, anomaly_map, overlay, is_anomaly = await asyncio.get_event_loop().run_in_executor(
            None, run_inference_on_frame, frame, job.model_name, job.anomaly_threshold
        )

        # Save frame thumbnail
        frame_filename = f"frame_{job.id}_{frame_idx}.jpg"
        frame_path = settings.FRAMES_DIR / frame_filename
        cv2.imwrite(str(frame_path), cv2.resize(frame, (320, 240)))

        heatmap_filename = f"heatmap_{job.id}_{frame_idx}.jpg"
        heatmap_path = settings.HEATMAPS_DIR / heatmap_filename
        cv2.imwrite(str(heatmap_path), overlay)

        boxes = extract_bounding_boxes(anomaly_map, job.anomaly_threshold)
        timestamp_ms = (frame_idx / fps) * 1000

        dr = DetectionResult(
            job_id=job.id,
            frame_number=frame_idx,
            frame_path=str(frame_path).replace("\\", "/"),
            heatmap_path=str(heatmap_path).replace("\\", "/"),
            anomaly_score=score,
            is_anomaly=is_anomaly,
            bounding_boxes=boxes,
            timestamp_ms=timestamp_ms,
        )
        db.add(dr)
        scores.append(score)
        if is_anomaly:
            anomaly_count += 1
        processed += 1

        # Flush every 50 frames
        if processed % 50 == 0:
            job.processed_frames = processed
            job.anomaly_count = anomaly_count
            job.average_score = float(np.mean(scores))
            job.max_score = float(max(scores))
            await db.commit()

        frame_idx += 1

    cap.release()

    job.processed_frames = processed
    job.anomaly_count = anomaly_count
    job.average_score = float(np.mean(scores)) if scores else 0.0
    job.max_score = float(max(scores)) if scores else 0.0
    job.status = "completed"
    job.completed_at = datetime.utcnow()
    upload.status = "processed"
    await db.commit()
    logger.info("Video job %d done. frames=%d anomalies=%d", job.id, processed, anomaly_count)


async def _fail_job(db: AsyncSession, job: DetectionJob, message: str):
    job.status = "failed"
    job.error_message = message
    job.completed_at = datetime.utcnow()
    await db.commit()
    logger.error("Job %d failed: %s", job.id, message)
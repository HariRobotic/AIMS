# AI Autonomous Monitoring System

An end-to-end, full-stack anomaly detection platform powered by [Anomalib](https://github.com/openvinotoolkit/anomalib). Upload images or videos, run AI-driven detection, and visualise results in a real-time web dashboard.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                       │
│  Dashboard │ Upload │ History │ Media Library │ Analytics     │
│  Camera Streams │ Admin                                       │
│  MUI + Chart.js + Axios + Zustand + React Router             │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP/REST  (JWT Auth)
┌────────────────────────────▼─────────────────────────────────┐
│                     BACKEND (FastAPI)                         │
│  /api/auth  /api/detections  /api/analytics                  │
│  /api/admin  /api/streams                                     │
│  SQLAlchemy (async) │ JWT │ Background Tasks                  │
└────────────────────────────┬─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼───────┐  ┌───────▼───────┐  ┌────────▼───────┐
│  SQLite DB     │  │  Anomalib     │  │  File Storage  │
│  (aiosqlite)   │  │  (PyTorch +   │  │  uploads/      │
│                │  │   OpenCV)     │  │  frames/       │
│  Users         │  │               │  │  heatmaps/     │
│  Uploads       │  │  PaDiM        │  │                │
│  DetectionJobs │  │  PatchCore    │  └────────────────┘
│  DetectionRes  │  │  EfficientAD  │
│  CameraStreams │  │  FastFlow     │
└────────────────┘  └───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Material UI 5, Chart.js, Axios, Zustand, React Router 6 |
| Backend | Python 3.11, FastAPI, SQLAlchemy (async), JWT auth |
| AI Engine | [Anomalib 1.1](https://github.com/openvinotoolkit/anomalib), PyTorch, OpenCV |
| Database | SQLite (via aiosqlite) |
| Container | Docker, Docker Compose, Nginx |

---

## Quick Start

### Option 1 – Docker Compose (recommended)

```bash
# Clone / download the project
cd anomaly-monitor

# Copy and edit environment
cp backend/.env.example backend/.env
# Edit SECRET_KEY and any other settings

# Build and run
docker compose up --build

# Frontend →  http://localhost:3000
# Backend API → http://localhost:8000/docs
```

### Option 2 – Local development

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit as needed
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm start                         # runs on http://localhost:3000
```

---

## Default Credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin1234` |

> **Important:** change the admin password and `SECRET_KEY` before any public deployment.

---

## System Modules

### AI Detection Engine (`backend/services/detection.py`)

- Runs Anomalib models (PaDiM by default) on images or video frames
- Produces **anomaly score** [0–1], **anomaly map**, and **heatmap overlay** (BGR + JET colourmap blend)
- Extracts **bounding boxes** around anomalous regions via contour analysis
- Operates in **mock mode** automatically if Anomalib is not installed (useful for UI development)
- Video files are sampled at 1 fps to balance speed vs. coverage (configurable)

### Backend API (`backend/api/`)

| Router | Endpoints |
|--------|-----------|
| `auth.py` | `POST /register`, `POST /login`, `GET /me`, `POST /logout` |
| `detections.py` | `POST /upload`, `POST /jobs`, `GET /jobs`, `GET /jobs/{id}`, `GET /jobs/{id}/results`, `GET /uploads` |
| `analytics.py` | `GET /summary`, `GET /timeseries`, `GET /score-distribution` |
| `admin.py` | `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/{id}`, `DELETE /admin/users/{id}` |
| `admin.py` | `GET /streams`, `POST /streams`, `DELETE /streams/{id}` |

Full interactive API docs available at **http://localhost:8000/docs** (Swagger UI).

### Database Models (`backend/models/database.py`)

| Table | Purpose |
|-------|---------|
| `users` | Accounts with hashed passwords, admin flag, last-login |
| `upload_records` | File metadata (path, type, size, dimensions, duration) |
| `detection_jobs` | Job lifecycle, model config, aggregate scores |
| `detection_results` | Per-frame scores, heatmap paths, bounding boxes |
| `camera_streams` | RTSP/HTTP stream configuration |

### Frontend Pages (`frontend/src/pages/`)

| Page | Route | Description |
|------|-------|-------------|
| Auth | `/login` | Login + Register with JWT |
| Dashboard | `/dashboard` | KPI cards, trend chart, recent activity table |
| Upload & Detect | `/upload` | Drag-and-drop upload, model/threshold config, live job progress |
| Detection History | `/history` | Paginated job list with heatmap grid viewer |
| Media Library | `/videos` | Searchable file grid with metadata |
| Analytics | `/analytics` | Bar, line, doughnut, and histogram charts |
| Camera Streams | `/streams` | RTSP/HTTP stream management |
| Admin | `/admin` | System stats, user CRUD, model list |

---

## Detection Models

| Model | Speed | Accuracy | Notes |
|-------|-------|----------|-------|
| **PaDiM** | Fast | High | Default; good for textures |
| **PatchCore** | Medium | Very High | Best overall accuracy |
| **EfficientAD** | Very Fast | High | Lightweight for edge devices |
| **FastFlow** | Fast | High | Normalizing flow approach |
| **Reverse Distillation** | Medium | High | Teacher-student architecture |

---

## Configuration

All settings in `backend/.env` (or environment variables):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | JWT signing key |
| `DATABASE_URL` | SQLite | SQLAlchemy async URL |
| `ANOMALIB_MODEL` | `padim` | Detection model to use |
| `ANOMALY_THRESHOLD` | `0.5` | Score cutoff for anomaly flag |
| `MAX_IMAGE_SIZE_MB` | `20` | Max image upload size |
| `MAX_VIDEO_SIZE_MB` | `500` | Max video upload size |
| `DEBUG` | `false` | Enable SQLAlchemy query logging |

---

## API Authentication

All endpoints (except `/api/auth/register` and `/api/auth/login`) require a Bearer token:

```http
Authorization: Bearer <access_token>
```

Tokens are valid for 24 hours by default.

---

## Extending the System

**Add a new Anomalib model:**
1. Import the model class in `services/detection.py`
2. Add it to the `model_map` dict in `_get_model()`
3. Add it to `AVAILABLE_MODELS` in `api/admin.py`

**Add PostgreSQL:**
```
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
```
Add `asyncpg` to `requirements.txt`.

**Add real-time WebSocket streaming:**
FastAPI supports WebSockets natively. Add a `/ws/jobs/{job_id}` endpoint that streams job progress events.

---

## Project Structure

```
anomaly-monitor/
├── backend/
│   ├── api/
│   │   ├── auth.py           # Auth routes
│   │   ├── detections.py     # Upload + job routes
│   │   ├── analytics.py      # Analytics routes
│   │   └── admin.py          # Admin + stream routes
│   ├── core/
│   │   └── config.py         # Pydantic settings
│   ├── models/
│   │   ├── database.py       # SQLAlchemy ORM models + engine
│   │   └── schemas.py        # Pydantic request/response schemas
│   ├── services/
│   │   ├── auth.py           # JWT + password hashing
│   │   └── detection.py      # Anomalib inference engine
│   ├── main.py               # FastAPI app + lifespan + routes
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── VideosPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── StreamsPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx    # Sidebar + outlet
│   │   ├── services/
│   │   │   └── api.js        # Axios client + all API calls
│   │   ├── store/
│   │   │   └── authStore.js  # Zustand auth state
│   │   ├── theme.js          # MUI dark theme
│   │   ├── App.jsx           # Router + auth guard
│   │   └── index.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml
```

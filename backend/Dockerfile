FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first
COPY requirements.txt .

# Install packages - headless opencv only
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall opencv-python -y || true && \
    pip install --no-cache-dir opencv-python-headless>=4.9.0.80 --force-reinstall

# Copy app
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
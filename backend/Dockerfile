FROM python:3.11-slim

WORKDIR /app

# Minimal system deps for Pillow/pydicom; no OpenCV/TensorFlow needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo zlib1g && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure the SQLite DB is seeded on first boot if the volume is empty.
RUN python -c "import database; database.init_db()"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# Brain Tumor Detection - Backend API

This is the backend API for the Brain Tumor Detection system, providing image processing and classification services.

## Overview

The backend is built with FastAPI and serves a deep learning model that can classify brain MRI scans into four categories: Glioma, Meningioma, No tumor, and Pituitary tumor.

## Features

- RESTful API for brain tumor classification
- Batch processing of multiple images
- Asynchronous processing with background tasks
- Healthcheck endpoint for monitoring
- Docker support for easy deployment

## Technologies Used

- Python 3.11
- FastAPI for the web API
- TensorFlow/Keras for the neural network model
- Pillow for image processing
- NumPy for numerical operations
- Uvicorn as the ASGI server

## API Endpoints

### POST /predict

Processes images and returns tumor detection results.

**Request Body:**
```json
{
  "image": [
    "base64_encoded_image_string",
    "another_base64_encoded_image_string"
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "detections": [
        {
          "classId": 0,
          "className": "Glioma",
          "confidence": 95.42
        }
      ]
    },
    {
      "id": 2,
      "detections": [
        {
          "classId": 2,
          "className": "Notumor",
          "confidence": 99.87
        }
      ]
    }
  ]
}
```

### GET /healthcheck

Checks if the service and model are running properly.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

## Setup and Installation

### Local Development

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Make sure you have the model file:
   - Place the `tumor-detection.keras` model in the `models/` directory

4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t brain-tumor-api .
   ```

2. Run the container:
   ```bash
   docker run -p 8000:8000 brain-tumor-api
   ```

## API Documentation

Once the server is running, you can access the auto-generated API documentation:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── models/              # Directory containing the trained model file
│   └── tumor-detection.keras
├── main.py              # Main FastAPI application
├── models.py            # Pydantic models for request/response schema
├── Dockerfile           # Docker configuration
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## Performance Considerations

- The API uses an LRU cache to avoid reloading the model for each request
- Batch processing is optimized with a thread pool executor
- The model is loaded at startup to reduce latency on first request

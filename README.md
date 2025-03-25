# Brain Tumor Detection System

A complete solution for detecting and classifying brain tumors from MRI scans using deep learning, featuring a React frontend and FastAPI backend.

## Project Overview

This system assists medical professionals by providing an easy-to-use interface for analyzing brain MRI scans. The system classifies brain images into four categories: Glioma, Meningioma, No tumor, and Pituitary tumor.

## Components

The project consists of two main components:

1. **Frontend**: A React application with an intuitive user interface for image upload and visualization
2. **Backend**: A FastAPI service that processes images and runs the tumor detection model

## Features

- Modern, responsive web interface with light/dark theme support
- Drag-and-drop image upload functionality
- Multi-image batch processing
- Real-time visual feedback with custom MRI-themed loading animation
- Detailed classification results with confidence scores
- RESTful API for integration with other systems
- Docker support for easy deployment

## Technology Stack

### Frontend
- React 18
- Styled Components for UI styling
- Material UI icons
- Axios for API communication
- React file image to base64 for image encoding

### Backend
- Python 3.11
- FastAPI for the web API
- TensorFlow/Keras for the neural network model
- Pillow for image processing
- NumPy for numerical operations
- Uvicorn as the ASGI server

## System Architecture

```
brain-tumor-detection/
├── frontend/               # React frontend application
├── backend/                # FastAPI backend service
├── keras-test/             # Training-testing notebook
└── README.md               # This file
```

## Frontend

The frontend provides a user-friendly interface for uploading and analyzing brain MRI scans.

### Frontend Features
- Light and dark theme toggle
- Drag-and-drop interface for image uploads
- Support for multiple image uploads
- Real-time visual feedback during processing
- Color-coded results display

### Frontend Structure

```
frontend/
├── public/                # Static files
├── src/
│   ├── Components/        # React components
│   │   ├── ImageUpload.jsx   # Image upload component
│   │   ├── ResultCard.jsx    # Results display component
│   │   ├── Loader/          # Loading animation
│   │   ├── PredictedImageCard.jsx  # Image card component
│   │   └── ImagesCard.jsx   # Thumbnail component
│   ├── utils/            # Utility functions
│   │   ├── prediction.js    # API integration
│   │   └── themes.js        # Theme definitions
│   ├── App.js            # Main application component
│   └── index.js          # Entry point
├── Dockerfile            # Docker configuration
└── package.json          # Dependencies and scripts
```

## Backend API

The backend provides endpoints for processing brain MRI scans and returning classification results.

### API Endpoints

#### POST /predict

Processes base64-encoded images and returns tumor detection results.

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

#### GET /healthcheck

Checks if the service and model are running properly.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### Backend Structure

```
backend/
├── models/              # Trained model files
│   └── tumor-detection.keras
├── main.py              # FastAPI application
├── models.py            # Pydantic models for request/response
├── Dockerfile           # Docker configuration
├── requirements.txt     # Python dependencies
└── README.md            # Backend documentation
```

## Model Training and Testing

The `keras-test` directory contains a Jupyter notebook (`training-testing.ipynb`) for training and testing the deep learning model on brain MRI scans.

### Model Architecture

The tumor detection model uses a convolutional neural network (CNN) that classifies brain MRI scans into four categories:
- Glioma (classId: 0)
- Meningioma (classId: 1)
- No tumor (classId: 2)
- Pituitary (classId: 3)

### Dataset

The model is trained using a dataset of brain MRI scans from the Kaggle Brain MRI dataset, with images standardized to the appropriate input size for the neural network.

## Installation and Setup

### Prerequisites
- Node.js for frontend
- Python 3.11+ for backend
- Docker (optional, for containerized deployment)

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Access the frontend at http://localhost:3000

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Make sure you have the model file in the models directory

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

6. Access the API at http://localhost:8000

### Docker Deployment

For the frontend:
```bash
cd frontend
docker build -t brain-tumor-frontend .
docker run -p 80:80 brain-tumor-frontend
```

For the backend:
```bash
cd backend
docker build -t brain-tumor-api .
docker run -p 8000:8000 brain-tumor-api
```

## Usage Guide

### Uploading Images

1. Access the web interface at http://localhost:3000
2. Drag and drop MRI scan images onto the upload area or click "Browse Image"
3. Once images are uploaded, click the "PREDICT" button
4. The system will process the images and display results

### Interpreting Results

Each result card shows:
- The classification (tumor type or no tumor)
- Confidence percentage
- A progress bar indicating confidence level
- Red coloring for tumor detections, green for no tumor

## API Client Examples

### JavaScript

```javascript
// Function to encode image to base64
async function encodeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Example usage in a form
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const imageFiles = document.querySelector('input[type="file"]').files;
  const encodedImages = await Promise.all(
    Array.from(imageFiles).map(file => encodeImage(file))
  );
  
  try {
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: encodedImages })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    
    const data = await response.json();
    data.results.forEach(result => {
      console.log(`Image ${result.id}:`);
      result.detections.forEach(detection => {
        console.log(`  ${detection.className}: ${detection.confidence}%`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
});
```

## Frontend Components

### App.js
The main component that handles:
- Theme switching (light/dark)
- Managing image states
- Calling the prediction API
- Displaying results

### ImageUpload.jsx
Component for uploading images with:
- Drag and drop functionality
- File browser option
- Visual feedback for the upload process

### ResultCard.jsx
Displays the classification results:
- Shows the image
- Displays tumor type or "No Tumor Detected"
- Shows confidence percentage
- Includes a color-coded progress bar

### Loader Component
Custom MRI scan-themed loading animation that appears during image processing.

## Performance Considerations

- The API uses caching to avoid reloading the model for each request
- Batch processing for multiple images
- The model is loaded at startup to reduce latency on first request
- Frontend uses optimized image processing techniques

## Troubleshooting

### Common Frontend Issues

1. **Image upload problems**
   - Ensure images are in supported formats (JPEG, PNG)
   - Check browser console for errors

2. **Connection issues**
   - Confirm the backend API is running
   - Verify network connectivity

### Common Backend Issues

1. **Model loading error**
   - Verify the model file is in the correct location
   - Ensure you have sufficient memory for the model

2. **Image processing error**
   - Check if the image is in a supported format
   - Verify the image encoding is correct

## License

This project is licensed under the MIT License.

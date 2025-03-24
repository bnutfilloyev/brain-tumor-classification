import axios from 'axios';

const generatePrediction = async (images) => {
    try {
        console.log("🔄 Prediction jarayoni boshlandi...");

        const imageData = images.map(img => img.base64_file);
        const data = { image: imageData };

        const response = await axios.post('http://localhost:8000/predict', data);

        console.log("🔍 Prediction natijalari:", response);

        if (response && response.data && response.data.results) {
            console.log("✅ Prediction muvaffaqiyatli bajarildi.");
            return response.data.results.map((detection, idx) => ({
                image: imageData[idx],
                detections: detection && detection.detections ? detection.detections.map(det => ({
                    classId: det.classId,
                    confidence: det.confidence,
                })) : []
            }));
        } else {
            console.error("❗️ Noto‘g‘ri response format.");
            alert("Error: Prediction response format is incorrect.");
            return [];
        }

    } catch (error) {
        console.error("❌ Predictionda xatolik yuz berdi:", error);
        alert("Prediction failed. Please try again.");
        return [];
    }
}

export default generatePrediction;
from keras.models import load_model
import numpy as np
from keras.preprocessing import image
import matplotlib.pyplot as plt

# Modelni yuklash
model = load_model('model.keras')

# Class mapping
class_mappings = {0: 'Glioma', 1: 'Meninigioma', 2: 'Notumor', 3: 'Pituitary'}

# Tasvirni yuklash va tayyorlash funksiyasi
def prepare_image(image_path, target_size=(168, 168)):
    img = image.load_img(image_path, target_size=target_size, color_mode='grayscale')
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # Model uchun batch dimension qo'shish
    img_array /= 255.0  # Normalize
    return img_array

# Inference funksiyasi
def predict_image(image_path):
    img_array = prepare_image(image_path)
    
    prediction = model.predict(img_array)
    predicted_class = np.argmax(prediction[0])  # Eng katta ehtimollikni aniqlash
    confidence = np.max(prediction[0]) * 100  # Ehtimollik foiz shaklida

    plt.imshow(image.load_img(image_path), cmap='gray')
    plt.title(f"Prediction: {class_mappings[predicted_class]} (Confidence: {confidence:.2f}%)")
    plt.axis('off')
    plt.show()

# Sinov uchun rasm yo‘li
image_path = 'local_image.jpg'  # O'z tasviringizni kiriting
predict_image(image_path)
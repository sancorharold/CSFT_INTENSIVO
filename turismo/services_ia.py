import numpy as np
import os
import logging
from django.conf import settings

# Configurar logger
logger = logging.getLogger(__name__)

# Intentamos importar las librerías de IA
# Usamos un bloque try/except para que tu proyecto no se rompa si no has instalado tensorflow aún.
try:
    from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
    from tensorflow.keras.preprocessing import image
    from scipy.spatial.distance import cosine
    
    # Cargamos el modelo una sola vez al iniciar el servidor (Optimización)
    # include_top=False: No queremos clasificar "gato/perro", queremos vectores de características visuales.
    # pooling='avg': Aplana el resultado 3D a un vector simple.
    base_model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg')
    IA_AVAILABLE = True
    print("✅ Modelo IA (MobileNetV2) cargado y listo para comparar imágenes.")
except ImportError:
    IA_AVAILABLE = False
    base_model = None
    print("⚠️ TensorFlow o SciPy no detectados. Instala: pip install tensorflow pillow numpy scipy")
except Exception as e:
    IA_AVAILABLE = False
    base_model = None
    print(f"⚠️ Error inicializando modelo IA: {e}")

def obtener_vector_caracteristicas(ruta_imagen):
    """
    Convierte una imagen en un vector numérico (lista de números) que representa su contenido visual.
    """
    if not IA_AVAILABLE or base_model is None:
        return None

    try:
        # 1. Cargar imagen redimensionando a 224x224 (estándar MobileNet)
        img = image.load_img(ruta_imagen, target_size=(224, 224))
        
        # 2. Convertir a array numérico
        x = image.img_to_array(img)
        
        # 3. Expandir dimensiones (de 224,224,3 a 1,224,224,3)
        x = np.expand_dims(x, axis=0)
        
        # 4. Preprocesar (normalizar píxeles)
        x = preprocess_input(x)
        
        # 5. Extraer características
        features = base_model.predict(x)
        
        # 6. Aplanar a vector 1D
        return features.flatten()
        
    except Exception as e:
        logger.error(f"Error IA procesando imagen {ruta_imagen}: {e}")
        return None

def calcular_similitud(ruta_img_usuario, ruta_img_referencia):
    """
    Compara dos imágenes y devuelve un porcentaje de similitud (0.0 a 1.0).
    1.0 = Imágenes idénticas
    0.0 = Imágenes totalmente diferentes
    """
    if not IA_AVAILABLE:
        return 0.0
        
    if not os.path.exists(ruta_img_usuario) or not os.path.exists(ruta_img_referencia):
        logger.warning(f"Falta archivo de imagen para comparación: {ruta_img_referencia}")
        return 0.0

    # Obtener las "huellas digitales" de ambas fotos
    vec_usuario = obtener_vector_caracteristicas(ruta_img_usuario)
    vec_referencia = obtener_vector_caracteristicas(ruta_img_referencia)

    if vec_usuario is None or vec_referencia is None:
        return 0.0

    # Calculamos la Distancia Coseno
    # Distancia 0 = Iguales. Distancia 1 o más = Diferentes.
    # Invertimos para obtener "Similitud"
    try:
        distancia = cosine(vec_usuario, vec_referencia)
        similitud = 1.0 - distancia
        # Aseguramos rango 0-1
        return max(0.0, min(1.0, similitud))
    except Exception as e:
        logger.error(f"Error matemático calculando similitud: {e}")
        return 0.0
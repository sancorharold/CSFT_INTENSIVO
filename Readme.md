<div align="center">

<img src="https://img.shields.io/badge/Django-092E20?logo=django&logoColor=white"/>
<img src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black"/>
<img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white"/>
<img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white"/>
<img src="https://img.shields.io/badge/OpenCV-5C3EE8?logo=opencv&logoColor=white"/>
</div>
# Proyecto de Turismo Inteligente con Django e IA

Una aplicación web desarrollada con Django que combina inteligencia artificial y geolocalización para mejorar la experiencia turística. Permite a los usuarios identificar lugares turísticos a través de fotos, recibir recomendaciones personalizadas, evaluar el nivel de riesgo de una zona y conectar con otros viajeros.
Para aclarar los datos que se presenten en este projecto solamente enstan ubicados a zonas de ecuador debido al tiempo de creación

## Características Principales

-   **Reconocimiento de Lugares por IA**: Sube una foto y la app identificará el sitio turístico utilizando un modelo MobileNetV2 para comparar la similitud visual con una base de datos de referencia.
-   **Recomendaciones Contextuales**: Recibe sugerencias de lugares cercanos, priorizadas según el contexto detectado en tu entorno (playa, parque, ciudad) a través de modelos de detección de objetos.
-   **Mapa de Riesgo**: Consulta el nivel de riesgo de una zona en tiempo real. El sistema utiliza un modelo de Machine Learning (K-Means) entrenado con datos históricos y lo ajusta con factores dinámicos como la hora del día.
-   **Perfil de Viajero y Gamificación**: Un perfil de usuario que registra tus estadísticas (fotos tomadas, lugares visitados) y te permite desbloquear logros para incentivar la exploración.
-   **Sistema Social**: Agrega amigos, gestiona solicitudes de amistad y chatea en tiempo real con otros usuarios.
-   **Búsqueda y Detalles de Sitios**: Explora una base de datos de sitios turísticos con información detallada, ubicación y recomendaciones de otros lugares cercanos.

## 🛠️ Tecnologías Utilizadas

-   **Backend**: Django
-   **Base de Datos**: PostgreSQL (`psycopg2-binary`)
-   **IA (Reconocimiento de Imágenes)**: TensorFlow, Keras (MobileNetV2), SciPy, Pillow
-   **IA (Análisis de Riesgo)**: Scikit-learn, Pandas, Joblib
-   **IA (Detección de Contexto)**: Ultralytics (YOLO)
-   **Frontend**: HTML, CSS, JavaScript (Vanilla)
-   **Despliegue**: Preparado para `dj-database-url` y almacenamiento en la nube con `django-storage-supabase`.

## Instalación y Puesta en Marcha

Sigue estos pasos para configurar el entorno de desarrollo local.

### Prerrequisitos

-   Python 3.8+
-   `pip` y `venv`

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd CSFT_INTENSIVO-main
```

### 2. Crear y Activar un Entorno Virtual

-   **En macOS/Linux:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
-   **En Windows:**
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

### 3. Instalar Dependencias

El archivo `requeriments.txt` contiene un listado de las librerías necesarias. Gracias a la corrección anterior, este comando funcionará sin problemas.

```bash
pip install -r requeriments.txt
```

### 4. Configurar la Base de Datos

Aplica las migraciones para crear las tablas en la base de datos.

```bash
python manage.py migrate
```

### 5. Crear un Superusuario

Esto te permitirá acceder al panel de administración de Django para gestionar los sitios turísticos.

```bash
python manage.py createsuperuser
```

### 6. Ejecutar el Servidor

```bash
python manage.py runserver
```

¡Listo! La aplicación estará disponible en `http://127.0.0.1:8000/`.

## 📂 Estructura del Proyecto

-   `turismo/`: App principal. Gestiona los sitios turísticos, recomendaciones y la lógica de IA para reconocimiento de imágenes.
-   `accounts/`: App de usuarios. Gestiona perfiles, autenticación, sistema de amigos y chat.
-   `riesgo/`: App para el análisis de riesgo. Provee una API para calcular el riesgo de una zona geográfica.
-   `static/`: Archivos estáticos (JS, CSS, imágenes).
-   `templates/`: Plantillas HTML de Django.
-   `manage.py`: Script de gestión de Django.
-   `requeriments.txt`: Lista de dependencias de Python.

## 📝 Uso de la Aplicación

1.  **Añadir Sitios Turísticos**:
    -   Accede al panel de administración en `/admin` con tu superusuario.
    -   Ve a la sección "Sitios Turisticos" y añade nuevos lugares.
    -   **Importante**: Sube una imagen de referencia clara y representativa en el campo `imagen_referencia`. Esta imagen es la "huella digital" que la IA usará para las comparaciones.

2.  **Reconocer un Lugar**:
    -   En la interfaz principal, utiliza el botón flotante de la cámara.
    -   Puedes tomar una foto en el momento o subir una desde tu galería.
    -   La aplicación enviará la foto y tu ubicación al backend. El sistema primero filtrará los sitios cercanos y luego usará la IA para encontrar la coincidencia más probable.
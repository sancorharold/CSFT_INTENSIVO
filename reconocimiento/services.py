from ultralytics import YOLO
from collections import Counter

# Cargar modelo YOLOv8 (ligero)
model = YOLO("yolov8n.pt")

# Clases que consideramos "emprendimientos"
EMPRENDIMIENTOS = {
    "restaurant",
    "cafe",
    "bar",
    "bakery",
    "shop",
    "market",
    "hotel"
}

def analizar_imagen(ruta_imagen):
    """
    Analiza una imagen y devuelve contexto del lugar
    """

    results = model(ruta_imagen, verbose=False)

    detecciones = []

    for r in results:
        for box in r.boxes:
            clase_id = int(box.cls[0])
            clase_nombre = model.names[clase_id]
            detecciones.append(clase_nombre)

    conteo = Counter(detecciones)

    total_emprendimientos = sum(
        conteo[c] for c in conteo if c in EMPRENDIMIENTOS
    )

    # Inferencia simple de zona
    if total_emprendimientos >= 5:
        tipo_zona = "turistica"
    elif total_emprendimientos >= 2:
        tipo_zona = "urbana"
    else:
        tipo_zona = "rural"

    return {
        "detecciones": conteo,
        "total_emprendimientos": total_emprendimientos,
        "tipo_zona": tipo_zona
    }

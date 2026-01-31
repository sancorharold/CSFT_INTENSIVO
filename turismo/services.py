from .models import SitioTuristico
from .utils import distancia_km

def recomendar_por_contexto(lat, lon, contexto):
    sitios = SitioTuristico.objects.filter(
        latitud__isnull=False,
        longitud__isnull=False
    )

    if not sitios.exists():
        return {
            "mensaje": "No hay sitios turísticos con ubicación válida"
        }

    sitio_mas_cercano = None
    menor_distancia = float("inf")  # este es el valor 'sesgado' usado para elegir
    mejor_distancia_real = None       # distancia real en km del sitio elegido

    import logging
    logger = logging.getLogger(__name__)

    # Mapeo aproximado de detecciones a categorías del modelo SitioTuristico
    DETECTION_TO_CATEGORY = {
        "restaurant": "ciudad",
        "cafe": "ciudad",
        "bar": "ciudad",
        "bakery": "ciudad",
        "hotel": "ciudad",
        "shop": "ciudad",
        "market": "ciudad",
        "surfboard": "playa",
        "beach": "playa",
        "boat": "playa",
        "park": "parque",
        "tree": "parque",
        "mountain": "parque",
        "waterfall": "cascada",
        "lake": "laguna",
        "monument": "monumento",
    }

    # Calculamos la categoría 'preferida' por las detecciones
    detecciones = contexto.get("detecciones", {}) if contexto else {}
    category_scores = {}
    for det, count in dict(detecciones).items():
        cat = DETECTION_TO_CATEGORY.get(det)
        if cat:
            category_scores[cat] = category_scores.get(cat, 0) + int(count)

    preferred_category = None
    if category_scores:
        preferred_category = max(category_scores.items(), key=lambda x: x[1])[0]

    total_checked = 0
    skipped_invalid = 0

    for sitio in sitios:
        total_checked += 1
        try:
            lat_s = float(sitio.latitud)
            lon_s = float(sitio.longitud)
        except Exception as e:
            skipped_invalid += 1
            logger.warning(f"[RECO-DEBUG] sitio={sitio.id} lat/lon inválidos: {sitio.latitud}/{sitio.longitud} -> {e}")
            continue

        # Validar que coordenadas estén dentro de Ecuador razonable
        if not (-6.0 <= lat_s <= 3.0 and -92.0 <= lon_s <= -75.0):
            skipped_invalid += 1
            logger.warning(f"[RECO-DEBUG] sitio={sitio.id} fuera de Ecuador: {lat_s}/{lon_s}")
            continue

        try:
            d = distancia_km(
                lat,
                lon,
                lat_s,
                lon_s
            )
        except Exception as e:
            skipped_invalid += 1
            logger.warning(f"[RECO-DEBUG] error calculando distancia con sitio={sitio.id}: {e}")
            continue

        # Sesgamos la distancia si el sitio coincide con la categoría detectada
        effective = d
        if preferred_category and sitio.categoria == preferred_category:
            effective = d * 0.6  # reducir distancia efectiva para priorizar

        if effective < menor_distancia:
            menor_distancia = effective
            sitio_mas_cercano = sitio
            mejor_distancia_real = d

    logger.info(f"[RECO-DEBUG] total_sitios={sitios.count()} checked={total_checked} skipped_invalid={skipped_invalid} preferred_category={preferred_category}")

    if sitio_mas_cercano is None:
        return {
            "mensaje": "No se pudo calcular una recomendación"
        }

    # Si el sitio más cercano está demasiado lejos en distancia real, devolvemos un mensaje claro
    MAX_DISTANCE_KM = 50.0
    if mejor_distancia_real is None:
        return {"mensaje": "No se encontró un sitio válido"}

    if mejor_distancia_real > MAX_DISTANCE_KM:
        return {
            "mensaje": f"No se encontraron sitios turísticos dentro de {MAX_DISTANCE_KM} km. Sitio más cercano a {round(mejor_distancia_real,2)} km.",
            "id": sitio_mas_cercano.id,
            "nombre": sitio_mas_cercano.nombre,
            "categoria": sitio_mas_cercano.categoria,
            "provincia": sitio_mas_cercano.provincia,
            "lat": float(sitio_mas_cercano.latitud),
            "lon": float(sitio_mas_cercano.longitud),
            "distancia_km": round(mejor_distancia_real, 2),
            "tipo_zona_detectada": contexto.get("tipo_zona") if contexto else None
        }

    return {
        "id": sitio_mas_cercano.id,
        "nombre": sitio_mas_cercano.nombre,
        "categoria": sitio_mas_cercano.categoria,
        "provincia": sitio_mas_cercano.provincia,
        "lat": float(sitio_mas_cercano.latitud),
        "lon": float(sitio_mas_cercano.longitud),
        "distancia_km": round(menor_distancia, 2),
        "tipo_zona_detectada": contexto["tipo_zona"]
    }


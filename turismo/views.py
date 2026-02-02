from django.views import View
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import SitioTuristico
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import math
import os
import logging

# --- IMPORTACIÓN SEGURA DEL SERVICIO DE IA ---
# Esto evita que el servidor falle si falta el archivo services_ia.py
try:
    from .services_ia import calcular_similitud
except ImportError:
    # Fallback si el archivo no existe
    logging.getLogger(__name__).warning("⚠️ No se encontró 'turismo/services_ia.py'. La IA no funcionará.")
    def calcular_similitud(a, b): return 0.0

logger = logging.getLogger(__name__)

# --- FUNCIONES AUXILIARES ---

def haversine(lat1, lon1, lat2, lon2):
    """Calcula distancia en km entre dos puntos geográficos (Fórmula Haversine)"""
    R = 6371  # Radio de la Tierra en km
    try:
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlambda = math.radians(float(lon2) - float(lon1))

        a = math.sin(dphi / 2) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except (ValueError, TypeError):
        return float('inf')

# --- VISTAS ---

class CamaraView(View):
    def get(self, request):
        return render(request, "turismo/camara.html")

class SitioDetalleView(View):
    def get(self, request, pk):
        sitio_principal = get_object_or_404(SitioTuristico, pk=pk)
        
        # Buscar sitios cercanos para recomendar (excluyendo el actual)
        otros_sitios = SitioTuristico.objects.filter(activo=True).exclude(pk=pk)
        recomendaciones = []
        
        for otro in otros_sitios:
            dist = haversine(
                sitio_principal.latitud, sitio_principal.longitud,
                otro.latitud, otro.longitud
            )
            # Solo recomendamos si está a menos de 50km
            if dist < 50.0:
                recomendaciones.append({
                    'id': otro.id,
                    'nombre': otro.nombre,
                    'categoria': otro.categoria,
                    'provincia': otro.provincia,
                    'distancia_km': round(dist, 2),
                    # Usamos imagen_referencia si existe, sino un placeholder
                    'imagen_url': otro.imagen_referencia.url if hasattr(otro, 'imagen_referencia') and otro.imagen_referencia else None
                })
        
        # Ordenar por cercanía y tomar top 4
        recomendaciones.sort(key=lambda x: x['distancia_km'])
        top_recomendaciones = recomendaciones[:4]
        
        context = {
            'sitio': sitio_principal,
            'recomendaciones': top_recomendaciones
        }
        return render(request, "turismo/detalle_sitio.html", context)

class SitiosCercanosView(View):
    def get(self, request):
        try:
            lat = float(request.GET.get("lat"))
            lon = float(request.GET.get("lon"))
        except (TypeError, ValueError):
            return JsonResponse({"error": "Parámetros lat y lon son requeridos"}, status=400)

        sitios = SitioTuristico.objects.filter(activo=True)
        resultados = []

        for sitio in sitios:
            distancia = haversine(lat, lon, sitio.latitud, sitio.longitud)
            resultados.append({
                "id": sitio.id,
                "nombre": sitio.nombre,
                "categoria": sitio.categoria,
                "provincia": sitio.provincia,
                "distancia_km": round(distancia, 2),
                "lat": sitio.latitud,
                "lon": sitio.longitud,
                "imagen_url": sitio.imagen_referencia.url if sitio.imagen_referencia else "",
            })

        resultados.sort(key=lambda x: x["distancia_km"])
        return JsonResponse({
            "total": len(resultados),
            "sitios": resultados[:5]
        })

@method_decorator(csrf_exempt, name="dispatch")
class RecomendacionPorFotoView(View):
    """
    Vista principal que combina Geolocalización + Inteligencia Artificial
    para identificar un sitio turístico.
    """
    def post(self, request, *args, **kwargs):
        imagen = request.FILES.get("imagen")
        lat_str = request.POST.get("lat")
        lon_str = request.POST.get("lon")

        if not imagen or not lat_str or not lon_str:
            return JsonResponse({"error": "Faltan datos: imagen, lat, lon"}, status=400)

        try:
            user_lat = float(lat_str)
            user_lon = float(lon_str)
        except ValueError:
            return JsonResponse({"error": "Coordenadas inválidas"}, status=400)

        # 1. Guardar imagen temporal del usuario para analizarla
        temp_dir = os.path.join(settings.MEDIA_ROOT, "temp")
        os.makedirs(temp_dir, exist_ok=True)
        ruta_temp = os.path.join(temp_dir, "busqueda_usuario.jpg")
        
        with open(ruta_temp, "wb+") as destino:
            for chunk in imagen.chunks():
                destino.write(chunk)

        # 2. FILTRO GEOGRÁFICO (Geo-fencing) - PASO CRÍTICO
        # Solo compararemos con IA los sitios que estén a menos de 1 KM.
        # Esto evita comparar una foto de una iglesia en Quito con una en Cuenca.
        RADIO_BUSQUEDA_KM = 10.0 
        candidatos = []
        
        todos_sitios = SitioTuristico.objects.filter(activo=True)
        
        for sitio in todos_sitios:
            dist = haversine(user_lat, user_lon, sitio.latitud, sitio.longitud)
            if dist <= RADIO_BUSQUEDA_KM:
                candidatos.append((sitio, dist))
        
        # Ordenar candidatos por distancia (el más cercano primero)
        candidatos.sort(key=lambda x: x[1])

        # CASO: No hay ningún sitio registrado cerca
        if not candidatos:
            return JsonResponse({
                "mensaje": "No se encontraron sitios turísticos registrados en tu ubicación actual (Radio 1km).",
                "tipo": "not_found"
            })

        # 3. ANÁLISIS DE SIMILITUD VISUAL (IA)
        mejor_match = None
        mejor_score = 0.0
        
        for sitio, dist in candidatos:
            # Solo podemos comparar si el administrador subió una foto de referencia
            if hasattr(sitio, 'imagen_referencia') and sitio.imagen_referencia:
                try:
                    ruta_ref = sitio.imagen_referencia.path
                    if os.path.exists(ruta_ref):
                        # Llamamos a nuestro servicio de IA
                        score = calcular_similitud(ruta_temp, ruta_ref)
                        logger.info(f"Comparando con '{sitio.nombre}': Similitud IA = {score:.2f}")
                        
                        if score > mejor_score:
                            mejor_score = score
                            mejor_match = sitio
                except Exception as e:
                    logger.error(f"Error comparando imagen para sitio {sitio.id}: {e}")

        # 4. LÓGICA DE DECISIÓN
        UMBRAL_COINCIDENCIA = 0.70  # 70% de similitud requerida para decir "ES ESTE"
        UMBRAL_SUGERENCIA_DIST = 10.20 # 200 metros para sugerir por cercanía

        # ESCENARIO A: La IA confirma que se parece visualmente
        if mejor_match and mejor_score >= UMBRAL_COINCIDENCIA:
            return JsonResponse({
                "tipo": "success",
                "mensaje": f"¡Sitio identificado! Estás en {mejor_match.nombre}",
                "id": mejor_match.id,
                "nombre": mejor_match.nombre,
                "score": round(float(mejor_score), 2)
            })
        
        # ESCENARIO B: No se parece visualmente, pero el usuario está MUY cerca (Sugerencia)
        sitio_mas_cercano = candidatos[0][0]
        dist_mas_cercana = candidatos[0][1]

        if dist_mas_cercana <= UMBRAL_SUGERENCIA_DIST:
            return JsonResponse({
                "tipo": "suggestion",
                "mensaje": f"No reconocemos la imagen exactamente, pero estás muy cerca de '{sitio_mas_cercano.nombre}'. ¿Es este el lugar que buscas?",
                "id": sitio_mas_cercano.id,
                "nombre": sitio_mas_cercano.nombre,
                "distancia": round(dist_mas_cercana, 3)
            })

        # ESCENARIO C: Ni se parece, ni está tan cerca
        return JsonResponse({
            "tipo": "not_found",
            "mensaje": "No logramos identificar visualmente el sitio y la foto no coincide con los lugares cercanos.",
            "recomendacion_cercana": {
                "nombre": sitio_mas_cercano.nombre,
                "distancia_km": round(dist_mas_cercana, 2)
            }
        })
from django.views import View
from django.shortcuts import render
from django.http import JsonResponse
from .models import SitioTuristico
import math
import os
from django.conf import settings
from reconocimiento.services import analizar_imagen
from .services import recomendar_por_contexto
import time
import logging
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

##CAMARA VIEW
class CamaraView(View):
    def get(self, request):
        return render(request, "turismo/camara.html")
    
# Create your views here.
class SitiosCercanosView(View):
    def get(self, request):
        try:
            lat = float(request.GET.get("lat"))
            lon = float(request.GET.get("lon"))
        except (TypeError, ValueError):
            return JsonResponse(
                {"error": "Parámetros lat y lon son requeridos"},
                status=400
            )

        sitios = SitioTuristico.objects.filter(activo=True)

        resultados = []

        for sitio in sitios:
            distancia = haversine(
                lat, lon,
                sitio.latitud, sitio.longitud
            )

            resultados.append({
                "id": sitio.id,
                "nombre": sitio.nombre,
                "categoria": sitio.categoria,
                "provincia": sitio.provincia,
                "distancia_km": round(distancia, 2),
                "lat": sitio.latitud,
                "lon": sitio.longitud,
            })

        resultados.sort(key=lambda x: x["distancia_km"])

        return JsonResponse({
            "total": len(resultados),
            "sitios": resultados[:5]  # top 5 cercanos
        })
##

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # radio de la tierra en km

    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(dphi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

#Para la recomendación basada en contexto
@method_decorator(csrf_exempt, name="dispatch")
class RecomendacionPorFotoView(View):

    def post(self, request, *args, **kwargs):
        imagen = request.FILES.get("imagen")
        lat = request.POST.get("lat")
        lon = request.POST.get("lon")

        if not imagen or not lat or not lon:
            return JsonResponse(
                {"error": "imagen, lat y lon son obligatorios"},
                status=400
            )

        ruta = os.path.join(settings.MEDIA_ROOT, "temp.jpg")
        with open(ruta, "wb+") as destino:
            for chunk in imagen.chunks():
                destino.write(chunk)

        logger = logging.getLogger(__name__)

        # Medir tiempo de inferencia y tamaño de imagen
        start_infer = time.time()
        contexto = analizar_imagen(ruta)
        infer_time = time.time() - start_infer

        try:
            size_bytes = os.path.getsize(ruta)
        except Exception:
            size_bytes = None

        logger.info(f"[RECO] lat={lat} lon={lon} image_size={size_bytes} bytes infer_time={infer_time:.2f}s tipo_zona={contexto.get('tipo_zona') if contexto else None}")
        print(f"[RECO] lat={lat} lon={lon} image_size={size_bytes} bytes infer_time={infer_time:.2f}s tipo_zona={contexto.get('tipo_zona') if contexto else None}")

        resultado = recomendar_por_contexto(
            float(lat),
            float(lon),
            contexto
        )

        # Log resultado y distancia final (si viene)
        logger.info(f"[RECO-RESULT] resultado={resultado}")
        print(f"[RECO-RESULT] resultado={resultado}")

        return JsonResponse(resultado, safe=False)


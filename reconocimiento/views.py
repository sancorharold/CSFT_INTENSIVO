from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import tempfile

from .services import analizar_imagen


@method_decorator(csrf_exempt, name="dispatch")
class ReconocerImagenView(View):

    def post(self, request, *args, **kwargs):
        imagen = request.FILES.get("imagen")

        if not imagen:
            return JsonResponse(
                {"error": "No se envió imagen"},
                status=400
            )

        with tempfile.NamedTemporaryFile(delete=False) as temp:
            for chunk in imagen.chunks():
                temp.write(chunk)
            ruta = temp.name

        etiquetas = analizar_imagen(ruta)

        return JsonResponse({
            "etiquetas_detectadas": etiquetas
        })

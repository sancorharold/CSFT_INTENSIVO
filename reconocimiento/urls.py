from django.urls import path
from .views import ReconocerImagenView

app_name = "reconocimiento"

urlpatterns = [
    path(
        "analizar/",ReconocerImagenView.as_view(),name="analizar_imagen"),
]

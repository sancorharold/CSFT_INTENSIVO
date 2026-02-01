from django.urls import path
from .views import CamaraView, SitiosCercanosView, RecomendacionPorFotoView,SitioDetalleView


app_name = 'turismo'

urlpatterns = [
    path("cercanos/", SitiosCercanosView.as_view(), name="sitios_cercanos"), 
    path("recomendar/",RecomendacionPorFotoView.as_view(),name="recomendar_por_foto"),
    path("camara/", CamaraView.as_view(), name="camara"),
    path('sitio/<int:pk>/', SitioDetalleView.as_view(), name='detalle_sitio')
]
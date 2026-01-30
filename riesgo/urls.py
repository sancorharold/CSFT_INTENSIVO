from django.urls import path
from . import views

app_name = 'riesgo'

urlpatterns = [
    # Esta es la ruta que llamará el mapa usando AJAX/Fetch
    path('api/calcular/', views.calcular_riesgo_zona, name='calcular_riesgo'),
]
from django.shortcuts import render
import joblib
import json
import os
import numpy as np
from django.conf import settings
from django.http import JsonResponse
from datetime import datetime

# --- CARGA INICIAL (OPTIMIZACIÓN) ---
# Cargamos el modelo una sola vez al arrancar Django para que sea rápido
ruta_modelo = os.path.join(settings.BASE_DIR, 'riesgo/modelo_zonas.pkl')
ruta_json = os.path.join(settings.BASE_DIR, 'riesgo/datos_riesgo.json')

try:
    modelo_kmeans = joblib.load(ruta_modelo)
    with open(ruta_json, 'r') as f:
        datos_riesgo = json.load(f) # Las claves del JSON suelen cargarse como strings
except Exception as e:
    print(f"Error cargando modelos de IA: {e}")
    modelo_kmeans = None
    datos_riesgo = {}

# --- VISTA API ---
def calcular_riesgo_zona(request):
    """
    API que recibe ?lat=X&lng=Y y devuelve el nivel de riesgo y color.
    """
    lat = request.GET.get('lat')
    lng = request.GET.get('lng')

    if not modelo_kmeans or not lat or not lng:
        return JsonResponse({'status': 'error', 'msg': 'Faltan datos o modelo no cargado'}, status=400)

    try:
        # 1. PREDUCCIÓN ESPACIAL (IA)
        # ¿A qué cluster (zona) pertenece esta coordenada?
        coordenada = np.array([[float(lat), float(lng)]])
        cluster_id = modelo_kmeans.predict(coordenada)[0]
        
        # Recuperamos el riesgo base (histórico del CSV)
        # Nota: al leer JSON las claves son strings, por eso str(cluster_id)
        riesgo_base = datos_riesgo.get(str(cluster_id), 0)

        # 2. ANÁLISIS DINÁMICO (Lógica de Negocio / Heurística)
        # Factor hora: Aumenta el riesgo si es de noche
        hora_actual = datetime.now().hour
        es_noche = hora_actual < 6 or hora_actual > 19 # Entre 7PM y 6AM
        
        riesgo_final = riesgo_base
        mensaje = "Nivel de riesgo basado en histórico delictivo."

        if es_noche:
            # Aumentamos el riesgo un 20% si es de noche
            riesgo_final = riesgo_final * 1.2
            mensaje += " (Aumentado por horario nocturno)."

        # Tope máximo de 10
        riesgo_final = min(riesgo_final, 10)

        # 3. SEMÁFORO (COLORES)
        color = "#28a745" # Verde (Safe)
        if riesgo_final > 3: color = "#ffc107" # Amarillo (Warning)
        if riesgo_final > 7: color = "#dc3545" # Rojo (Danger)

        return JsonResponse({
            'status': 'success',
            'cluster_id': int(cluster_id),
            'nivel_riesgo': round(riesgo_final, 2),
            'color': color,
            'mensaje': mensaje
        })

    except Exception as e:
        return JsonResponse({'status': 'error', 'msg': str(e)}, status=500)

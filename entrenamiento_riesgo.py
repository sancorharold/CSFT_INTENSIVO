import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import joblib
import json


df = pd.read_csv('datos_delitos_ecuador_listo.csv')
df = df.dropna(subset=['latitud', 'longitud', 'TOTAL'])
df['peso_riesgo'] = df['TOTAL'] 

X = df[['latitud', 'longitud']]

kmeans = KMeans(n_clusters=50, random_state=42, n_init=10)
df['cluster_id'] = kmeans.fit_predict(X)

riesgo_por_cluster = df.groupby('cluster_id')['TOTAL'].sum()

max_delitos = riesgo_por_cluster.max()
min_delitos = riesgo_por_cluster.min()

riesgo_normalizado = (riesgo_por_cluster - min_delitos) / (max_delitos - min_delitos) * 10
riesgo_normalizado = riesgo_normalizado.round(1) # Redondear a 1 decimal

joblib.dump(kmeans, 'riesgo/modelo_zonas.pkl')

with open('riesgo/datos_riesgo.json', 'w') as f:
    json.dump(riesgo_normalizado.to_dict(), f)

print("✅ Entrenamiento finalizado.")
print(f"   Se generaron {len(riesgo_normalizado)} zonas de riesgo.")
print(f"   Ejemplo: La zona {riesgo_normalizado.idxmax()} tiene el riesgo más alto ({riesgo_normalizado.max()}).")
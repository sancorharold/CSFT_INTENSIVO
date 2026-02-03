import csv
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from turismo.models import SitioTuristico

class Command(BaseCommand):
    help = "Carga sitios turísticos desde CSV a Supabase (PostgreSQL)"

    def handle(self, *args, **kwargs):
        # 1. Definir la ruta del archivo
        # Asegúrate de que el CSV esté en: tu_proyecto/turismo/data/sitios_turisticos.csv
        ruta = Path(settings.BASE_DIR) / "turismo" / "data" / "sitios_turisticos.csv"

        if not ruta.exists():
            self.stdout.write(self.style.ERROR(f"❌ CSV no encontrado en: {ruta}"))
            return

        self.stdout.write(self.style.SUCCESS(f"🚀 Iniciando carga desde: {ruta}"))

        creados = 0
        actualizados = 0
        skipped = 0

        # 2. Abrir el archivo con 'utf-8-sig' para evitar errores de BOM de Excel
        with open(ruta, newline='', encoding="utf-8-sig") as csvfile:
            reader = csv.DictReader(csvfile)

            for i, row in enumerate(reader, start=1):
                # Intentar obtener lat/lon de varias posibles columnas
                lat_val = row.get("lat") or row.get("latitude") or row.get("latitud")
                lon_val = row.get("lon") or row.get("lng") or row.get("long") or row.get("longitud")

                try:
                    # Validar que los valores existan y sean números
                    if lat_val is None or lon_val is None:
                        raise ValueError("Valores nulos")
                    
                    latf = float(str(lat_val).replace(',', '.'))
                    lonf = float(str(lon_val).replace(',', '.'))
                except (ValueError, TypeError):
                    self.stdout.write(self.style.WARNING(f"⚠️ Fila {i}: Coordenadas inválidas ({lat_val}, {lon_val}). Se omite."))
                    skipped += 1
                    continue

                # 3. Validar coordenadas dentro de Ecuador (incluyendo Galápagos)
                if not (-6.0 <= latf <= 3.0 and -93.0 <= lonf <= -75.0):
                    self.stdout.write(self.style.WARNING(f"⚠️ Fila {i}: Fuera de Ecuador (lat={latf}, lon={lonf}). Se omite."))
                    skipped += 1
                    continue

                # 4. Guardar en la base de datos (Supabase)
                # Usamos update_or_create para no duplicar si el nombre y provincia coinciden
                nombre_sitio = row.get("nombre") or f"sitio_{i}"
                provincia_sitio = row.get("provincia", "Desconocida")

                obj, created = SitioTuristico.objects.update_or_create(
                    nombre=nombre_sitio,
                    provincia=provincia_sitio,
                    defaults={
                        'categoria': (row.get("categoria") or "otro").lower().strip(),
                        'latitud': latf,
                        'longitud': lonf,
                        'descripcion': row.get("descripcion", ""),
                        'activo': True
                    }
                )

                if created:
                    creados += 1
                else:
                    actualizados += 1

                # Mostrar progreso cada 100 registros
                if (creados + actualizados) % 100 == 0:
                    self.stdout.write(f"⏳ Procesados {creados + actualizados} sitios...")

        # 5. Resumen final
        self.stdout.write("---")
        self.stdout.write(self.style.SUCCESS(f"✅ Carga finalizada con éxito"))
        self.stdout.write(f"➕ Nuevos creados: {creados}")
        self.stdout.write(f"🔄 Actualizados: {actualizados}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"⚠️ Filas omitidas: {skipped}"))
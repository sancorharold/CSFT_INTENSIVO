import csv
from django.core.management.base import BaseCommand
from turismo.models import SitioTuristico
from django.conf import settings
from pathlib import Path

class Command(BaseCommand):
    help = "Carga sitios turísticos desde CSV"

    def handle(self, *args, **kwargs):
        # 1. Definir la ruta del archivo
        ruta = Path(settings.BASE_DIR) / "turismo" / "data" / "sitios_turisticos.csv"

        if not ruta.exists():
            self.stdout.write(self.style.ERROR("❌ CSV no encontrado"))
            return

        creados = 0

        # 2. Abrir el archivo con 'utf-8-sig' (mejor compatibilidad con Excel)
        with open(ruta, newline='', encoding="utf-8-sig") as csvfile:
            reader = csv.DictReader(csvfile)

            skipped = 0
            
            # 3. El bucle ahora está indentado DENTRO del 'with'
            for i, row in enumerate(reader, start=1):
                # Intentar obtener lat/lon de varias posibles columnas
                lat_val = row.get("lat") or row.get("latitude") or row.get("latitud")
                lon_val = row.get("lon") or row.get("lng") or row.get("long") or row.get("longitud")

                try:
                    # Convertimos a str() primero para evitar el error de Pylance con None
                    # Si es texto inválido o "None", el float fallará y caerá en el except
                    latf = float(str(lat_val))
                    lonf = float(str(lon_val))
                except (ValueError, TypeError):
                    self.stdout.write(self.style.WARNING(f"⚠️ Fila {i}: coordenadas inválidas (lat={lat_val} lon={lon_val}), se omite"))
                    skipped += 1
                    continue

                # Opcional: validar que estén dentro de Ecuador
                if not (-6.0 <= latf <= 3.0 and -92.0 <= lonf <= -75.0):
                    self.stdout.write(self.style.WARNING(f"⚠️ Fila {i}: coordenadas fuera de Ecuador (lat={latf} lon={lonf}), se omite"))
                    skipped += 1
                    continue

                # Crear el objeto en la base de datos
                SitioTuristico.objects.create(
                    nombre=row.get("nombre") or f"sitio_{i}",
                    categoria=row.get("categoria") or "otro",
                    provincia=row.get("provincia", ""),
                    latitud=latf,
                    longitud=lonf
                )
                creados += 1

            # 4. Resumen final (aún dentro del método handle, pero fuera del for)
            if skipped:
                self.stdout.write(self.style.WARNING(f"⚠️ Filas omitidas: {skipped}"))

            self.stdout.write(
                self.style.SUCCESS(f"✅ Sitios cargados correctamente: {creados}")
            )
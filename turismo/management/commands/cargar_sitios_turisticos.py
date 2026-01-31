import csv
from django.core.management.base import BaseCommand
from turismo.models import SitioTuristico
from django.conf import settings
from pathlib import Path

class Command(BaseCommand):
    help = "Carga sitios turísticos desde CSV"

    def handle(self, *args, **kwargs):
        ruta = Path(settings.BASE_DIR) / "turismo" / "data" / "sitios_turisticos.csv"

        if not ruta.exists():
            self.stdout.write(self.style.ERROR("❌ CSV no encontrado"))
            return

        creados = 0

        with open(ruta, newline='', encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            skipped = 0
        for i, row in enumerate(reader, start=1):
            lat_val = row.get("lat") or row.get("latitude") or row.get("latitud")
            lon_val = row.get("lon") or row.get("lng") or row.get("long") or row.get("longitud")

            try:
                latf = float(lat_val)
                lonf = float(lon_val)
            except Exception:
                self.stdout.write(self.style.WARNING(f"⚠️ Fila {i}: coordenadas inválidas (lat={lat_val} lon={lon_val}), se omite"))
                skipped += 1
                continue

            # Opcional: validar que estén dentro de Ecuador
            if not (-6.0 <= latf <= 3.0 and -92.0 <= lonf <= -75.0):
                self.stdout.write(self.style.WARNING(f"⚠️ Fila {i}: coordenadas fuera de Ecuador (lat={latf} lon={lonf}), se omite"))
                skipped += 1
                continue

            SitioTuristico.objects.create(
                nombre=row.get("nombre") or f"sitio_{i}",
                categoria=row.get("categoria") or "otro",
                provincia=row.get("provincia", ""),
                latitud=latf,
                longitud=lonf
            )
            creados += 1

        if skipped:
            self.stdout.write(self.style.WARNING(f"⚠️ Filas omitidas: {skipped}"))

        self.stdout.write(
            self.style.SUCCESS(f"✅ Sitios cargados correctamente: {creados}")
        )

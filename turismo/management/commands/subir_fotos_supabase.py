import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings
from turismo.models import SitioTuristico

class Command(BaseCommand):
    help = "Sube imágenes normalizando nombres de carpetas y base de datos"

    def handle(self, *args, **kwargs):
        ruta_media = Path(settings.BASE_DIR) / "media" / "sitios"

        if not ruta_media.exists():
            self.stdout.write(self.style.ERROR(f"❌ Carpeta no encontrada: {ruta_media}"))
            return

        creados = 0

        for carpeta_provincia in ruta_media.iterdir():
            if carpeta_provincia.is_dir():
                self.stdout.write(self.style.MIGRATE_LABEL(f"\n--- Provincia: {carpeta_provincia.name} ---"))

                for carpeta_sitio in carpeta_provincia.iterdir():
                    if carpeta_sitio.is_dir():
                        # 1. NORMALIZACIÓN: "cerro_de_chalcalo" -> "cerro de chalcalo"
                        nombre_carpeta = carpeta_sitio.name.replace('_', ' ').lower().strip()
                        
                        # 2. BUSQUEDA INTELIGENTE: Buscamos ignorando mayúsculas/minúsculas
                        # __iexact hace que "Cerro De Chalcalo" sea igual a "cerro de chalcalo"
                        sitio = SitioTuristico.objects.filter(nombre__iexact=nombre_carpeta).first()

                        if sitio:
                            if sitio.imagen_referencia:
                                self.stdout.write(f"  ⏭️  {sitio.nombre} ya tiene imagen.")
                                continue

                            # 3. Buscar imagen (JPG o PNG)
                            imagenes = list(carpeta_sitio.glob("*.jpg")) + list(carpeta_sitio.glob("*.png"))
                            if imagenes:
                                foto_path = imagenes[0]
                                with open(foto_path, 'rb') as f:
                                    sitio.imagen_referencia.save(foto_path.name, File(f), save=True)
                                self.stdout.write(self.style.SUCCESS(f"  ✅ Imagen subida: {sitio.nombre}"))
                                creados += 1
                        else:
                            # Si no lo encuentra, te avisa para que revises si el nombre en el CSV es igual
                            self.stdout.write(self.style.WARNING(f"  ❓ No encontrado en DB: '{nombre_carpeta}'"))

        self.stdout.write(self.style.SUCCESS(f"\n✨ Proceso finalizado. Se subieron {creados} imágenes nuevas."))
from django.contrib import admin
from .models import SitioTuristico

@admin.register(SitioTuristico)
class SitioTuristicoAdmin(admin.ModelAdmin):
    # Columnas que se verán en la lista principal
    list_display = ('nombre', 'provincia', 'categoria', 'latitud', 'longitud', 'activo', 'tiene_foto')
    
    # Filtros laterales para encontrar rápido los sitios
    list_filter = ('provincia', 'categoria', 'activo')
    
    # Barra de búsqueda
    search_fields = ('nombre', 'provincia', 'descripcion')
    
    # Organizar el formulario de edición en secciones limpias
    fieldsets = (
        ('Información General', {
            'fields': ('nombre', 'categoria', 'provincia', 'descripcion', 'activo')
        }),
        ('Ubicación Geográfica', {
            'fields': ('latitud', 'longitud'),
            'description': 'Coordenadas decimales (Ej: -2.190000, -79.890000)'
        }),
        ('Multimedia e Inteligencia Artificial', {
            'fields': ('imagen_referencia',),
            'description': '⚠️ IMPORTANTE: Sube una foto clara y representativa. Esta imagen será la "huella digital" que la IA usará para comparar y reconocer el sitio cuando los turistas tomen fotos.'
        }),
    )

    # Función auxiliar para mostrar un check verde si el sitio ya tiene foto subida
    def tiene_foto(self, obj):
        return bool(obj.imagen_referencia)
    tiene_foto.boolean = True
    tiene_foto.short_description = "¿Foto IA Lista?"
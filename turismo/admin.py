from django.contrib import admin
from .models import SitioTuristico

@admin.register(SitioTuristico)
class SitioTuristicoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "provincia", "categoria", "activo")
    list_filter = ("provincia", "categoria", "activo")
    search_fields = ("nombre",)


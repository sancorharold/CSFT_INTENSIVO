from django.db import models
from django.contrib.auth.models import User

def ruta_imagen_sitio(instance, filename):
    # Esto guarda la foto en: media/sitios/guayas/malecon2000/foto.jpg
    # Limpiamos nombres para evitar espacios
    provincia_clean = instance.provincia.replace(" ", "_").lower()
    nombre_clean = instance.nombre.replace(" ", "_").lower()
    return f"sitios/{provincia_clean}/{nombre_clean}/{filename}"

class SitioTuristico(models.Model):
    CATEGORIAS = [
        ("ciudad", "Ciudad turística"),
        ("cascada", "Cascada"),
        ("laguna", "Laguna"),
        ("playa", "Playa"),
        ("parque", "Parque nacional"),
        ("monumento", "Monumento"),
        ("cultural", "Patrimonio cultural"),
        ("otro", "Otro"),
    ]

    nombre = models.CharField(max_length=200) # El nombre suele ser largo
    categoria = models.CharField(max_length=100) # Aumenta de 20 a 100
    provincia = models.CharField(max_length=100) # Aumenta de 20 a 100
    
    # Campo nuevo para la IA
    imagen_referencia = models.ImageField(upload_to=ruta_imagen_sitio, null=True, blank=True, verbose_name="Foto de Referencia para IA")

    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)

    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    # (Opcional) Descripción para la vista de detalle
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Sitio turístico"
        verbose_name_plural = "Sitios turísticos"
        ordering = ["nombre"]

    ### Favoritos ###
    favoritos = models.ManyToManyField(
        User,
        related_name="sitios_favoritos",
        blank=True,
    )

    def __str__(self):
        return f"{self.nombre} ({self.provincia})"
    

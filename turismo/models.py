from django.db import models

# Create your models here.
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

    nombre = models.CharField(max_length=150)
    provincia = models.CharField(max_length=100)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)

    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)

    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sitio turístico"
        verbose_name_plural = "Sitios turísticos"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.provincia})"
from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    lugares_visitados = models.PositiveIntegerField(default=0)
    fotos_tomadas = models.PositiveIntegerField(default=0)
    dias_viajando = models.PositiveIntegerField(default=0)
    marco = models.CharField(max_length=20, default='default', blank=True)
    foto_perfil = models.ImageField(upload_to='perfiles/', null=True, blank=True)

    def __str__(self):
        return f'Perfil de {self.user.username}'

# Esta "señal" crea un Perfil automáticamente cada vez que un nuevo Usuario se registra
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    instance.profile.save()

class Friendship(models.Model):
    """Modelo para gestionar las solicitudes de amistad"""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        ACCEPTED = 'ACCEPTED', 'Aceptada'
        DECLINED = 'DECLINED', 'Rechazada'

    # El usuario que envía la solicitud
    from_user = models.ForeignKey(User, related_name='friendship_sender', on_delete=models.CASCADE)
    # El usuario que recibe la solicitud
    to_user = models.ForeignKey(User, related_name='friendship_receiver', on_delete=models.CASCADE)
    
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Asegura que no se pueda enviar una solicitud duplicada
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"De {self.from_user.username} a {self.to_user.username} - {self.get_status_display()}"

class Conversation(models.Model):
    """Representa un chat entre dos o más usuarios."""
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversación entre {', '.join([user.username for user in self.participants.all()])}"

class Message(models.Model):
    """Representa un mensaje individual dentro de una conversación."""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField(blank=True, default="")
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

class TypingStatus(models.Model):
    """Rastrea cuándo fue la última vez que un usuario escribió en un chat."""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now=True)
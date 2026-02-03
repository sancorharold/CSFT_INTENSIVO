from django.shortcuts import render, redirect
from django.contrib import messages
from django.views import View
from django.http import JsonResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import Friendship, Conversation, Message
from django.db.models import Q, F
from .models import Profile, Friendship, Conversation, Message

# Asegúrate de que el usuario esté logueado para acceder a esta vista
class ProfileView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        # Intentamos obtener el perfil, si no existe lo creamos al vuelo
        try:
            profile = request.user.profile
        except Exception: # Captura RelatedObjectDoesNotExist
            profile = Profile.objects.create(user=request.user)

        # Contamos las amistades aceptadas
        amigos_count = Friendship.objects.filter(
            (Q(from_user=request.user) | Q(to_user=request.user)),
            status=Friendship.Status.ACCEPTED
        ).count()

        context = {
            'profile': profile,
            'amigos_count': amigos_count,
        }
        return render(request, 'accounts/profile.html', context)
class FriendsView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        # Obtenemos las amistades aceptadas
        accepted_friendships = Friendship.objects.filter(
            (Q(from_user=request.user) | Q(to_user=request.user)),
            status=Friendship.Status.ACCEPTED
        )
        
        # Obtenemos las solicitudes pendientes que el usuario ha recibido
        pending_requests = Friendship.objects.filter(to_user=request.user, status=Friendship.Status.PENDING)

        context = {
            'friends_list': accepted_friendships,
            'pending_requests': pending_requests,
        }
        return render(request, 'accounts/friends_list.html', context)

class AcceptFriendRequestView(LoginRequiredMixin, View):
    def post(self, request, request_id):
        friend_request = get_object_or_404(Friendship, id=request_id, to_user=request.user)
        friend_request.status = Friendship.Status.ACCEPTED
        friend_request.save()
        messages.success(request, f"Ahora eres amigo de {friend_request.from_user.username}.")
        return redirect('accounts:friends')

class DeclineFriendRequestView(LoginRequiredMixin, View):
    def post(self, request, request_id):
        friend_request = get_object_or_404(Friendship, id=request_id, to_user=request.user)
        # En lugar de DECLINED, lo eliminamos para limpiar la lista
        friend_request.delete()
        messages.info(request, "Solicitud de amistad rechazada.")
        return redirect('accounts:friends')

class RemoveFriendView(LoginRequiredMixin, View):
    def post(self, request, friendship_id):
        friendship = get_object_or_404(Friendship, id=friendship_id, status=Friendship.Status.ACCEPTED)
        # Asegurarse que el usuario actual es parte de esa amistad
        if request.user == friendship.from_user or request.user == friendship.to_user:
            friendship.delete()
            messages.info(request, "Amistad eliminada.")
        return redirect('accounts:friends')

class EditProfileView(LoginRequiredMixin, View):
    def get(self, request):
        return render(request, 'accounts/edit_profile.html')

    def post(self, request):
        user = request.user
        profile = user.profile
        
        # Actualizamos los datos básicos
        user.username = request.POST.get('username')
        user.email = request.POST.get('email')
        
        # Actualizamos la foto de perfil si se subió una nueva
        if 'foto_perfil' in request.FILES:
            profile.foto_perfil = request.FILES['foto_perfil']

        # Actualizamos el marco (si se envió)
        if 'marco' in request.POST:
            profile.marco = request.POST.get('marco')
        
        try:
            user.save()
            profile.save()
            messages.success(request, 'Perfil actualizado correctamente.')
        except Exception as e:
            messages.error(request, 'Error al actualizar el perfil. El nombre de usuario podría estar en uso.')
            
        return redirect('accounts:profile')

class AchievementsView(LoginRequiredMixin, View):
    def get(self, request):
        profile = request.user.profile
        
        # Calculamos amigos para el logro social
        amigos_count = Friendship.objects.filter(
            (Q(from_user=request.user) | Q(to_user=request.user)),
            status=Friendship.Status.ACCEPTED
        ).count()

        # Definimos los logros y sus condiciones
        achievements_list = [
            {'title': 'Explorador Novato', 'desc': 'Visita 5 lugares', 'icon': '☀️', 'unlocked': profile.lugares_visitados >= 5},
            {'title': 'Fotógrafo Viajero', 'desc': 'Toma 10 fotos', 'icon': '📷', 'unlocked': profile.fotos_tomadas >= 10},
            {'title': 'Social Butterfly', 'desc': 'Ten 1 amigo', 'icon': '🦋', 'unlocked': amigos_count >= 1},
            {'title': 'Aventurero', 'desc': 'Viaja por 3 días', 'icon': '🌍', 'unlocked': profile.dias_viajando >= 3},
            {'title': 'Gran Viajero', 'desc': 'Visita 20 lugares', 'icon': '🚀', 'unlocked': profile.lugares_visitados >= 20},
            {'title': 'Influencer', 'desc': 'Ten 5 amigos', 'icon': '⭐', 'unlocked': amigos_count >= 5},
        ]

        context = {
            'achievements': achievements_list,
            'stats': profile
        }
        return render(request, 'accounts/achievements.html', context)

class IncrementPhotoCountView(LoginRequiredMixin, View):
    """
    Endpoint para incrementar el contador de fotos tomadas.
    Se llama vía AJAX desde el frontend.
    """
    def post(self, request, *args, **kwargs):
        profile = request.user.profile
        
        # Guardamos el valor anterior para la lógica de logros
        old_photo_count = profile.fotos_tomadas
        
        # Incrementamos el contador de forma atómica para evitar race conditions
        profile.fotos_tomadas = F('fotos_tomadas') + 1
        profile.save()
        
        # Recargamos el perfil desde la BD para obtener el valor actualizado
        profile.refresh_from_db()
        
        # --- Lógica de Desbloqueo de Logro ---
        newly_unlocked_achievement = None
        photo_achievement_threshold = 10 # El umbral para el logro
        if old_photo_count < photo_achievement_threshold and profile.fotos_tomadas >= photo_achievement_threshold:
            newly_unlocked_achievement = {'title': 'Fotógrafo Viajero', 'icon': '📷'}

        return JsonResponse({
            'success': True,
            'new_count': profile.fotos_tomadas,
            'unlocked_achievement': newly_unlocked_achievement
        })

class ConversationsListView(LoginRequiredMixin, View):
    def get(self, request):
        # Obtenemos las conversaciones donde participa el usuario actual
        conversations = request.user.conversations.all()
        context = {
            'conversations': conversations
        }
        return render(request, 'accounts/conversations_list.html', context)

class ConversationDetailView(LoginRequiredMixin, View):
    def get(self, request, other_user_id):
        other_user = get_object_or_404(User, id=other_user_id)
        
        # Busca una conversación existente o crea una nueva
        conversation = Conversation.objects.filter(participants=request.user).filter(participants=other_user).first()
        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, other_user)

        # Marcar mensajes como leídos
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        context = {
            'conversation': conversation,
            'other_user': other_user,
            'messages_list': conversation.messages.all()
        }
        return render(request, 'accounts/conversation_detail.html', context)

    def post(self, request, other_user_id):
        other_user = get_object_or_404(User, id=other_user_id)
        conversation = Conversation.objects.filter(participants=request.user).filter(participants=other_user).first()
        text = request.POST.get('message_text')

        if conversation and text:
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                text=text
            )
        
        return redirect('accounts:conversation_detail', other_user_id=other_user.id)
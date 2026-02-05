from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # La URL principal del perfil, ej: /accounts/profile/
    path('profile/', views.ProfileView.as_view(), name='profile'),
    
    # Aquí puedes agregar las URLs para las otras funcionalidades cuando las desarrolles
    path('friends/', views.FriendsView.as_view(), name='friends'),
    path('friends/find/', views.FindFriendsView.as_view(), name='find_friends'),
    path('friends/send/<int:user_id>/', views.SendFriendRequestView.as_view(), name='send_request'),
    path('profile/edit/', views.EditProfileView.as_view(), name='edit_profile'),
    path('achievements/', views.AchievementsView.as_view(), name='achievements'),
    path('increment-photo-count/', views.IncrementPhotoCountView.as_view(), name='increment_photo_count'),

    # URLs para acciones de amistad
    path('friends/accept/<int:request_id>/', views.AcceptFriendRequestView.as_view(), name='accept_friend_request'),
    path('friends/decline/<int:request_id>/', views.DeclineFriendRequestView.as_view(), name='decline_friend_request'),
    path('friends/remove/<int:friendship_id>/', views.RemoveFriendView.as_view(), name='remove_friend'),

    # URLs para mensajería
    path('messages/', views.ConversationsListView.as_view(), name='messages_list'),
    path('messages/chat/<int:other_user_id>/', views.ConversationDetailView.as_view(), name='conversation_detail'),
]
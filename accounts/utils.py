from accounts.models import Achievement, UserAchievement

def unlock(user, code):
    achievement = Achievement.objects.get(code=code)
    UserAchievement.objects.get_or_create(
        user=user,
        achievement=achievement
    )


def check_achievements(user):
    profile = user.profile

    # 🗺️ Lugares visitados
    if profile.lugares_visitados >= 5:
        unlock(user, "EXPLORADOR_NOVATO")

    # 📸 Fotos tomadas
    if profile.fotos_tomadas >= 10:
        unlock(user, "FOTOGRAFO_NOVATO")

    if profile.fotos_tomadas >= 100:
        unlock(user, "FOTOGRAFO_VIAJERO")

    # ❤️ Favoritos
    if profile.favorites.count() >= 5:
        unlock(user, "AMANTE_DE_LUGARES")

    if profile.favorites.count() >= 50:
        unlock(user, "EXPERTO_EN_FAVORITOS")

    # 👥 Amigos (cuando exista)
    if hasattr(user, "friends") and user.friends.count() >= 10:
        unlock(user, "SOCIAL_BUTTERFLY")
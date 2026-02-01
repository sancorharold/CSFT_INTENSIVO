from django.urls import path
from django.shortcuts import redirect
from . import views
from .views import MapView, home, LoginView, SignupView, logout_view

app_name = "core"

urlpatterns = [
    path("", lambda request: redirect("core:login")),  
    path("login/", views.LoginView.as_view(), name="login"),
    path("signup/", views.SignupView.as_view(), name="signup"),
    path("home/", views.home, name="home"),
    path("logout/", views.logout_view, name="logout"),
    path("mapa/", views.MapView.as_view(), name="map"),
    path("favoritos/", views.favoritos, name="favoritos"),
    path("toggle-favorito/", views.toggle_favorito, name="toggle_favorito"),

]

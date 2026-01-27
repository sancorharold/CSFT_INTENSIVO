from django.urls import path
from django.shortcuts import redirect
from .views import home, LoginView, SignupView, logout_view

app_name = "core"

urlpatterns = [
    path("", lambda request: redirect("core:login")),  
    path("login/", LoginView.as_view(), name="login"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("home/", home, name="home"),
    path("logout/", logout_view, name="logout"),
]

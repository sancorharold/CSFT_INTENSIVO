from django.shortcuts import render
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from django.contrib.auth.decorators import login_required
from .mixins import TitleContextMixin

class CustomLoginView(TitleContextMixin, LoginView):
    template_name = "login.html"
    title2 = "Iniciar Sesión"

    def get_success_url(self):
        # Redirige a la página principal después de un login exitoso
        return reverse_lazy("core:home")

@login_required(login_url="core:login")
def home(request):
    return render(request, "home.html", {"title": "Inicio"})



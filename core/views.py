from urllib import request
from django.views import View
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView

#################################################################################
@login_required(login_url='login')
def home(request):
    return render(request, 'home.html')

def logout_view(request):
    logout(request)
    return redirect('core:login')


class LoginView(View):
    template_name = "login.html"

    def get(self, request):
        return render(request, self.template_name)

    def post(self, request):
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is None:
            return render(request, self.template_name, {
                "error": "Usuario o contraseña incorrectos"
            })

        login(request, user)
        return redirect("core:home")

class SignupView(View):
    template_name = "signup.html"

    def get(self, request):
        return render(request, self.template_name)

    def post(self, request):
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")
        password2 = request.POST.get("password2")

        if not all([username, email, password, password2]):
            return render(request, self.template_name, {
                "error": "Todos los campos son obligatorios",
                "username": username,
                "email": email
            })

        if password != password2:
            return render(request, self.template_name, {
                "error": "Las contraseñas no coinciden",
                "username": username,
                "email": email
            })

        if len(password) < 8:
            return render(request, self.template_name, {
                "error": "La contraseña debe tener al menos 8 caracteres",
                "username": username,
                "email": email
            })

        if User.objects.filter(username=username).exists():
            return render(request, self.template_name, {
                "error": "El usuario ya existe",
                "email": email
            })

        if User.objects.filter(email=email).exists():
            return render(request, self.template_name, {
                "error": "El email ya está registrado",
                "username": username
            })

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        login(request, user)
        return redirect("core:home")

@method_decorator(login_required(login_url="core:login"), name="dispatch")
class HomeView(View):
    def get(self, request):
        return render(request, "home.html")


class MapView(LoginRequiredMixin, TemplateView):
    template_name = "map.html"
    login_url = "core:login"

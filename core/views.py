from urllib import request
from django.views import View
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
## favoritos
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Case, When, IntegerField, Value, Q
from turismo.models import SitioTuristico
from django.contrib.auth.decorators import login_required

#################################################################################
@login_required(login_url='login')
def home(request):
    # Paginación: mostrar 15 sitios por página
    per_page = 15
    page = request.GET.get('page', 1)
    q = request.GET.get('q', '').strip()

    queryset = SitioTuristico.objects.filter(activo=True)

    if q:
        # Filtramos por provincia y priorizamos coincidencias exactas/startswith/contains
        queryset = queryset.filter(provincia__icontains=q)
        priority = Case(
            When(provincia__iexact=q, then=Value(3)),
            When(provincia__istartswith=q, then=Value(2)),
            When(provincia__icontains=q, then=Value(1)),
            default=Value(0),
            output_field=IntegerField()
        )
        queryset = queryset.annotate(priority=priority).order_by('-priority', 'nombre')
    else:
        queryset = queryset.order_by('nombre')

    paginator = Paginator(queryset, per_page)
    try:
        sitios_page = paginator.page(page)
    except PageNotAnInteger:
        sitios_page = paginator.page(1)
    except EmptyPage:
        sitios_page = paginator.page(paginator.num_pages)

    return render(request, 'home.html', {
        'sitios': sitios_page.object_list,
        'page_obj': sitios_page,
        'paginator': paginator,
        'q': q
    })

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


######## favoritos ##########
@login_required
def favoritos(request):
    sitios = request.user.sitios_favoritos.all()
    return render(request, "turismo/favoritos.html", {
        "sitios": sitios
    })

@require_POST
def toggle_favorito(request):
    # Responder con JSON incluso si el usuario no está autenticado (evita redirección)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "No autenticado"}, status=401)

    sitio_id = request.POST.get("sitio_id")
    sitio = get_object_or_404(SitioTuristico, id=sitio_id)

    if request.user in sitio.favoritos.all():
        sitio.favoritos.remove(request.user)
        return JsonResponse({
            "favorito": False,
            "mensaje": "Eliminado de favoritos"
        })
    else:
        sitio.favoritos.add(request.user)
        return JsonResponse({
            "favorito": True,
            "mensaje": "Guardado en sitios favoritos"
        })
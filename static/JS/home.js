// --- 1. SELECTORES Y LÓGICA DEL MENÚ ---
const menuBtn  = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const overlay  = document.getElementById("overlay");

const toggleMenu = (isOpen) => {
    if (sideMenu) sideMenu.classList.toggle("active", isOpen);
    if (overlay) overlay.classList.toggle("active", isOpen);
};

if (menuBtn) menuBtn.addEventListener("click", () => toggleMenu(true));
if (overlay) overlay.addEventListener("click", () => toggleMenu(false));

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleMenu(false);
});

// --- 2. CARGA DINÁMICA (GEOLOCALIZACIÓN) ---
document.addEventListener("DOMContentLoaded", () => {
    // Buscamos el interruptor de seguridad que pusimos en el HTML
    const permitirCercanos = document.getElementById("js-permitir-cercanos");

    // VALIDACIÓN DEFINITIVA: 
    // Si no existe el interruptor o su valor es "false", detenemos el script.
    if (!permitirCercanos || permitirCercanos.value === "false") {
        console.log("🚀 Paginación o búsqueda activa. Geolocalización desactivada para proteger los datos de Django.");
        return; 
    }

    // Solo si estamos en la página 1 limpia ejecutamos la carga por cercanía
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const container = document.querySelector(".cards");
            if (!container) return;

            console.log("📍 Cargando sitios cercanos por ubicación...");
            
            fetch(`/turismo/sitios-cercanos/?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
                .then(res => res.json())
                .then(data => {
                    if (data.sitios && data.sitios.length > 0) {
                        container.innerHTML = ""; // Limpia los sitios genéricos
                        data.sitios.forEach(sitio => {
                            container.innerHTML += crearCardHtml(sitio);
                        });
                    }
                })
                .catch(err => console.error("Error cargando sitios cercanos:", err));
        });
    }
});

// Función auxiliar para renderizar las cards dinámicas
function crearCardHtml(sitio) {
    // Usamos el placeholder si la imagen_url viene vacía desde el servidor
    const imgUrl = sitio.imagen_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='100%' height='100%' fill='%23eaeaea'/><text x='50%' y='50%' font-size='18' text-anchor='middle' fill='%23666' dy='.3em'>Sin imagen</text></svg>";
    
    return `
        <div class="card">
            <div class="heart" data-id="${sitio.id}">
                <i class="fa-regular fa-heart"></i>
            </div>
            <img src="${imgUrl}" alt="${sitio.nombre}" onerror="this.src='https://placehold.co/600x400?text=Error+Imagen'">
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items: center;">
                    <h4 style="margin:0; font-size:1.1em;">${sitio.nombre}</h4>
                    <span style="color:#0b78ff; font-weight:bold; font-size:0.9em;">${sitio.distancia_km} km</span>
                </div>
                <p style="margin: 5px 0 0; font-size: 0.85em; color: #aaa;">${sitio.provincia} • ${sitio.categoria}</p>
            </div>
        </div>`;
}


// --- 3. LÓGICA DE FAVORITOS (Delegación de eventos) ---
document.addEventListener("click", function (e) {
    const heartBtn = e.target.closest(".heart");

    if (heartBtn) {
        e.stopPropagation();
        const sitioId = heartBtn.dataset.id;

        fetch("/toggle-favorito/", {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `sitio_id=${sitioId}`
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                mostrarToast(data.error);
                return;
            }
            // Cambiamos el icono según el estado
            heartBtn.innerHTML = data.favorito
                ? '<i class="fa-solid fa-heart"></i>'
                : '<i class="fa-regular fa-heart"></i>';

            mostrarToast(data.mensaje);
        })
        .catch(err => {
            console.error("Error en favoritos:", err);
            mostrarToast("Ocurrió un error. Intenta nuevamente.");
        });
    }
});

// --- 4. UTILIDADES (Cookies y Toasts) ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function mostrarToast(mensaje) {
    // Eliminar toast anterior si existe
    const oldToast = document.querySelector(".custom-toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");
    toast.className = "custom-toast";
    toast.innerText = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 110px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 12px 24px;
        border-radius: 30px;
        z-index: 9999;
        font-size: 0.9em;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 3000);
    }, 2000);
}
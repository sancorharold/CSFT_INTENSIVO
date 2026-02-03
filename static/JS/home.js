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
    const inputBusqueda = document.querySelector('input[name="q"]');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            // No sobreescribir si el usuario ya buscó algo manualmente
            if (inputBusqueda && inputBusqueda.value.trim() !== "") {
                console.log("📍 Búsqueda activa detectada. No se cargan sitios cercanos.");
                return; 
            }

            fetch(`/turismo/sitios-cercanos/?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
                .then(res => res.json())
                .then(data => {
                    const container = document.querySelector(".cards");
                    if (!container) return;
                    
                    container.innerHTML = ""; 

                    data.sitios.forEach(sitio => {
                        const imgUrl = sitio.imagen_url || "https://placehold.co/600x400?text=Sin+Foto";
                        
                        const html = `
                            <div class="card">
                                <div class="heart" data-id="${sitio.id}">
                                    <i class="fa-regular fa-heart"></i>
                                </div>
                                <img src="${imgUrl}" alt="${sitio.nombre}" 
                                     onerror="this.src='https://placehold.co/600x400?text=Error+de+Carga'">
                                <div class="card-body">
                                    <div style="display:flex; justify-content:space-between;">
                                        <span>${sitio.nombre}</span>
                                        <span style="color:#0b78ff; font-size:0.9em;">${sitio.distancia_km} km</span>
                                    </div>
                                    <small style="color:#666;">${sitio.provincia} • ${sitio.categoria}</small>
                                </div>
                            </div>
                        `;
                        container.innerHTML += html;
                    });
                })
                .catch(err => console.error("Error cargando sitios cercanos:", err));
        });
    }
});

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
    const toast = document.createElement("div");
    toast.innerText = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 110px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: #fff;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 9999;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}
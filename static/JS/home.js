//SELECTORES DE ELEMENTOS
const menuBtn  = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const overlay  = document.getElementById("overlay");



/**
 * Alterna la visibilidad del menú lateral y el overlay
 * @param {boolean} isOpen - Determina si se abre o se cierra
 */
const toggleMenu = (isOpen) => {
    sideMenu.classList.toggle("active", isOpen);
    overlay.classList.toggle("active", isOpen);
};


// Abrir el menú al hacer clic en el botón
menuBtn.addEventListener("click", () => toggleMenu(true));

// Cerrar el menú al hacer clic en el overlay (fuera del menú)
overlay.addEventListener("click", () => toggleMenu(false));

// Opcional: Cerrar menú con la tecla "Escape" para mejorar la accesibilidad
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleMenu(false);
});

// --- 1. CARGAR CARTILLAS CON IMÁGENES ---
document.addEventListener("DOMContentLoaded", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            // Llamamos a tu vista SitiosCercanosView
            // Asegúrate de que la URL '/turismo/sitios-cercanos/' coincida con tu urls.py
            fetch(`/turismo/sitios-cercanos/?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
                .then(res => res.json())
                .then(data => {
                    const container = document.querySelector(".cards");
                    if (!container) return;
                    container.innerHTML = ""; // Limpiar

                    data.sitios.forEach(sitio => {
                        // Aquí usamos la imagen que viene del Admin
                        const imgUrl = sitio.imagen_url || "https://placehold.co/600x400?text=Sin+Foto";
                        
                        const html = `
                            <div class="card">
                                <div class="heart" data-id="${sitio.id}">
                                    <i class="fa-regular fa-heart"></i>
                                </div>
                                <img src="${imgUrl}" alt="${sitio.nombre}" onerror="this.src='https://placehold.co/600x400?text=Sin+Imagen'">
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
                .catch(err => console.error("Error cargando sitios:", err));
        });
    }
});

// --- 2. FAVORITOS (Delegación de eventos) ---
// Se aplica esto en lugar de .querySelectorAll directo para que funcione en las cartillas nuevas
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
            console.error(err);
            mostrarToast("Ocurrió un error. Intenta nuevamente.");
        });
    }
});

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
    toast.style.position = "fixed";
    toast.style.bottom = "110px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "20px";
    toast.style.zIndex = "999";

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

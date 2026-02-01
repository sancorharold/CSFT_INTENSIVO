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

// FAVORITOS
document.querySelectorAll(".heart").forEach(heart => {
    heart.addEventListener("click", function (e) {
        e.stopPropagation(); // Evita que el clic se propague a otros elementos

        const sitioId = this.dataset.id;

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

            this.innerHTML = data.favorito
                ? '<i class="fa-solid fa-heart"></i>'
                : '<i class="fa-regular fa-heart"></i>';

            mostrarToast(data.mensaje);
        })
        .catch(err => {
            console.error(err);
            mostrarToast("Ocurrió un error. Intenta nuevamente.");
        });
    });
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
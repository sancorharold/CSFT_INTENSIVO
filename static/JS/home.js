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
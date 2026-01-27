const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");

menuBtn.onclick = () => {
    sideMenu.classList.add("active");
    overlay.classList.add("active");
};

overlay.onclick = () => {
    sideMenu.classList.remove("active");
    overlay.classList.remove("active");
};

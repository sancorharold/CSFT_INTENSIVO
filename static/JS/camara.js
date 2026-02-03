const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const btn = document.getElementById("capturar");

let currentLat = null;
let currentLon = null;




// 1. Acceder a la cámara
navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: "environment" } 
})
.then(stream => {
    video.srcObject = stream;
})
.catch(err => {
    console.error(err);
    alert("No se pudo acceder a la cámara. Revisa los permisos.");
});

// 2. RASTREO GPS EN TIEMPO REAL
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        pos => {
            currentLat = pos.coords.latitude;
            currentLon = pos.coords.longitude;
        },
        err => { console.warn("Error obteniendo GPS:", err); },
        { 
            enableHighAccuracy: true, 
            maximumAge: 2000, 
            timeout: 10000 
        }
    );
}

// 3. FUNCIÓN PARA OBTENER EL TOKEN (Indispensable para Django)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

btn.onclick = () => {
    // 1. INTENTO LEER EL TOKEN DIRECTAMENTE DEL HTML (Más seguro que la cookie)
    let token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

    // 2. SI NO EXISTE EN EL HTML, INTENTO LA COOKIE
    if (!token) {
        token = getCookie("csrftoken");
    }

    // 3. VALIDACIÓN
    if (!token) {
        alert("Error de seguridad: CSRF Token no encontrado. Recarga la página.");
        console.error("No se encontró el token CSRF en el HTML ni en las cookies.");
        return;
    }

    // A partir de aquí el resto de tu código...
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
    btn.disabled = true;
    
    // ... resto del proceso ...

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const sendWithCoords = (blob, lat, lon) => {
        const formData = new FormData();
        formData.append("imagen", blob, "foto.jpg");
        formData.append("lat", lat);
        formData.append("lon", lon);

        fetch("/turismo/recomendar/", {
            method: "POST",
            headers: {
                "X-CSRFToken": token // Llave de seguridad para Django
            },
            body: formData
        })
        .then(async res => {
            if (res.redirected) throw new Error("Sesión expirada. Reingresa.");
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Error en el servidor: " + res.status);
            }
            return res.json();
        })
        .then(data => {
            if (data.tipo === 'success' && data.id) {
                window.location.href = `/turismo/sitio/${data.id}/`;
            } else if (data.tipo === 'suggestion' && data.id) {
                if(confirm(data.mensaje)) {
                    window.location.href = `/turismo/sitio/${data.id}/`;
                } else {
                    resetButton();
                }
            } else {
                alert(data.mensaje || "No se identificó ningún sitio.");
                resetButton();
            }
        })
        .catch(err => {
            console.error("Error:", err);
            alert(err.message);
            resetButton();
        });
    };

    function resetButton() {
        btn.innerHTML = '<i class="fas fa-camera"></i> Capturar';
        btn.disabled = false;
    }

    // Optimización de imagen
    (function(){
        const MAX_WIDTH = 800;
        const tmp = document.createElement('canvas');
        const scale = Math.min(1, MAX_WIDTH / canvas.width);
        tmp.width = Math.round(canvas.width * scale);
        tmp.height = Math.round(canvas.height * scale);
        tmp.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, tmp.width, tmp.height);

        tmp.toBlob(blob => {
            if (currentLat && currentLon) {
                sendWithCoords(blob, currentLat, currentLon);
            } else {
                navigator.geolocation.getCurrentPosition(
                    pos => sendWithCoords(blob, pos.coords.latitude, pos.coords.longitude),
                    err => {
                        alert("Activa el GPS para recomendar sitios.");
                        resetButton();
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }
        }, 'image/jpeg', 0.7);
    })();
};
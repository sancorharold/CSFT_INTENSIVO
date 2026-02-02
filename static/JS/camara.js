const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const btn = document.getElementById("capturar");

// Variables para mantener la ubicación "fresca" en tiempo real
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

// 2. RASTREO GPS EN TIEMPO REAL (Solución a tu problema)
// Usamos watchPosition en vez de getCurrentPosition. 
// Esto actualiza las variables automáticamente si te mueves mientras tienes la página abierta.
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        pos => {
            currentLat = pos.coords.latitude;
            currentLon = pos.coords.longitude;
            // Descomenta esto para ver en la consola cómo cambian los números si caminas
            // console.log("📍 GPS Actualizado:", currentLat, currentLon);
        },
        err => { console.warn("Error obteniendo GPS:", err); },
        { 
            enableHighAccuracy: true, 
            maximumAge: 2000, // La ubicación no debe tener más de 2 segundos de antigüedad
            timeout: 10000 
        }
    );
}

btn.onclick = () => {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
    btn.disabled = true;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const sendWithCoords = (blob, lat, lon) => {
        const formData = new FormData();
        formData.append("imagen", blob, "foto.jpg");
        formData.append("lat", lat);
        formData.append("lon", lon);

        const token = getCookie("csrftoken");
        if (!token) {
            alert("Error de seguridad: No se encontró el token de sesión. Recarga la página.");
            resetButton();
            return;
        }

        fetch("/turismo/recomendar/", {
            method: "POST",
            headers: {
                "X-CSRFToken": token
            },
            body: formData
        })
        .then(async res => {
            // 1. Verificar redirecciones (ej. sesión expirada)
            if (res.redirected) {
                throw new Error("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
            }

            // 2. Verificar errores HTTP
            if (!res.ok) {
                let errorMsg = "Error en el servidor: " + res.status;
                try {
                    const errData = await res.json();
                    if (errData.error) errorMsg = errData.error;
                } catch(e) {}
                throw new Error(errorMsg);
            }

            // 3. Verificar que la respuesta sea JSON
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Respuesta inválida del servidor (no es JSON).");
            }

            return res.json();
        })
        .then(data => {
            console.log("Respuesta del servidor:", data);

            // MANEJO DE RESPUESTAS SEGÚN TU LÓGICA DE NEGOCIO
            
            // Caso A: Éxito total (Sitio identificado)
            if (data.tipo === 'success' && data.id) {
                window.location.href = `/turismo/sitio/${data.id}/`;
            } 
            // Caso B: Sugerencia por cercanía (Estás cerca pero la foto no coincide)
            else if (data.tipo === 'suggestion' && data.id) {
                if(confirm(data.mensaje)) {
                    window.location.href = `/turismo/sitio/${data.id}/`;
                } else {
                    resetButton();
                }
            } 
            // Caso C: No encontrado / Estás lejos
            else {
                alert(data.mensaje || "No se identificó ningún sitio turístico en esta zona.");
                resetButton();
            }
        })
        .catch(err => {
            console.error("Error en cámara:", err);
            alert(err.message || "Error de conexión con el servidor.");
            resetButton();
        });
    };

    function resetButton() {
        btn.innerHTML = '<i class="fas fa-camera"></i> Capturar';
        btn.disabled = false;
    }

    // Procesar y optimizar imagen antes de enviar
    (function(){
        const MAX_WIDTH = 800;
        const QUALITY = 0.7;
        const tmp = document.createElement('canvas');
        const scale = Math.min(1, MAX_WIDTH / canvas.width);
        tmp.width = Math.round(canvas.width * scale);
        tmp.height = Math.round(canvas.height * scale);
        tmp.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, tmp.width, tmp.height);

        tmp.toBlob(blob => {
            // VERIFICACIÓN CRÍTICA:
            // Si watchPosition ya nos dio coordenadas frescas, las usamos.
            if (currentLat && currentLon) {
                sendWithCoords(blob, currentLat, currentLon);
            } else {
                // Si acabas de abrir la app y el GPS aun no "calienta", forzamos una lectura.
                navigator.geolocation.getCurrentPosition(
                    pos => sendWithCoords(blob, pos.coords.latitude, pos.coords.longitude),
                    err => {
                        alert("Necesitamos tu ubicación exacta para funcionar. Activa el GPS.");
                        resetButton();
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }
        }, 'image/jpeg', QUALITY);
    })();
};

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
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const btn = document.getElementById("capturar");

// 1. Acceder a la cámara
navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: "environment" } // Prioriza la cámara trasera en móviles
})
.then(stream => {
    video.srcObject = stream;
})
.catch(err => {
    console.error(err);
    alert("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
});

// 2. Intentamos obtener coordenadas GPS al cargar para acelerar el proceso
let cachedCoords = null;
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => { cachedCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude }; },
        err => { console.warn("Geolocalización inicial falló:", err); },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

btn.onclick = () => {
    // Feedback visual en el botón
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    // Ajustar canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    // Función interna para enviar la foto
    const sendWithCoords = (blob, lat, lon) => {
        const formData = new FormData();
        formData.append("imagen", blob, "foto.jpg");
        formData.append("lat", lat);
        formData.append("lon", lon);

        fetch("/turismo/recomendar/", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            console.log("Respuesta del servidor:", data);

            // --- AQUÍ ESTÁ EL CAMBIO IMPORTANTE ---
            // Si el backend nos devuelve un ID, significa que identificó un sitio específico.
            // Redirigimos a la nueva vista de detalle (el boceto).
            if (data.id) {
                window.location.href = `/turismo/sitio/${data.id}/`;
            } 
            // Fallback: Si no hay ID (quizás solo encontró una zona genérica), vamos al mapa
            else if (data.lat && data.lon) {
                alert(data.mensaje || "Ubicación detectada, pero no un sitio específico.");
                const url = `/mapa/?lat=${encodeURIComponent(data.lat)}&lon=${encodeURIComponent(data.lon)}&msg=${encodeURIComponent(data.mensaje || '')}`;
                window.location.href = url;
            } else {
                // Caso de error o sin datos
                alert(data.mensaje || "No se encontraron coincidencias.");
                btn.innerHTML = '<i class="fas fa-camera"></i> Capturar';
                btn.disabled = false;
            }
        })
        .catch(err => {
            console.error(err);
            alert("Error al procesar la imagen o conectar con el servidor.");
            btn.innerHTML = '<i class="fas fa-camera"></i> Capturar';
            btn.disabled = false;
        });
    };

    // Optimización de imagen antes de enviar (Redimensionar)
    (function(){
        const MAX_WIDTH = 800;
        const QUALITY = 0.7;

        // Crear canvas temporal para redimensionar
        const tmp = document.createElement('canvas');
        const scale = Math.min(1, MAX_WIDTH / canvas.width);
        tmp.width = Math.round(canvas.width * scale);
        tmp.height = Math.round(canvas.height * scale);
        const tctx = tmp.getContext('2d');
        tctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, tmp.width, tmp.height);

        // Convertir a Blob y enviar
        tmp.toBlob(blob => {
            // Usar coordenadas cacheadas si existen, sino intentar obtenerlas de nuevo
            if (cachedCoords) {
                sendWithCoords(blob, cachedCoords.lat, cachedCoords.lon);
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        sendWithCoords(blob, pos.coords.latitude, pos.coords.longitude);
                    },
                    err => {
                        console.warn('Geolocalización falló en el momento de captura:', err);
                        alert("Necesitamos tu ubicación para recomendarte sitios cercanos.");
                        btn.innerHTML = '<i class="fas fa-camera"></i> Capturar';
                        btn.disabled = false;
                    },
                    { enableHighAccuracy: true, timeout: 7000 }
                );
            } else {
                alert("Tu navegador no soporta geolocalización.");
                btn.disabled = false;
            }
        }, 'image/jpeg', QUALITY);
    })();
};
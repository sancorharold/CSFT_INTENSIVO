const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const btn = document.getElementById("capturar");

// Acceder a la cámara
navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: "environment" } // Intentar usar la cámara trasera en móviles
})
.then(stream => {
    video.srcObject = stream;
})
.catch(err => {
    console.error(err);
    alert("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
});

// Intentamos obtener coordenadas al cargar para acelerar la captura
let cachedCoords = null;
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => { cachedCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude }; },
        err => { console.warn("Geolocalización inicial falló:", err); },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

btn.onclick = () => {
    // Feedback visual (opcional)
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
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

        fetch("/turismo/recomendar/", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.nombre) alert("Lugar recomendado: " + data.nombre);

            // Redirigir al mapa mostrando tanto el sitio recomendado como tu ubicación si están disponibles
            if (data.lat && data.lon) {
                const url = `/mapa/?lat=${encodeURIComponent(data.lat)}&lon=${encodeURIComponent(data.lon)}&sitio=${encodeURIComponent(data.nombre || '')}&userlat=${encodeURIComponent(lat)}&userlon=${encodeURIComponent(lon)}&msg=${encodeURIComponent(data.mensaje || '')}`;
                window.location.href = url;
            } else {
                // Si no hay coordenadas del sitio, redirigimos a mapa centrado en el usuario
                const url = `/mapa/?userlat=${encodeURIComponent(lat)}&userlon=${encodeURIComponent(lon)}&msg=${encodeURIComponent(data.mensaje || '')}`;
                window.location.href = url;
            }
        })
        .catch(err => {
            console.error(err);
            alert("Error al procesar la imagen");
            btn.innerHTML = '<i class="fas fa-camera"></i> Capturar';
            btn.disabled = false;
        });
    };

    // Reescalamos la imagen a un ancho máximo para reducir upload + inference
    (function(){
        const MAX_WIDTH = 800;
        const QUALITY = 0.7;

        // Creamos un canvas temporal con la nueva resolución
        const tmp = document.createElement('canvas');
        const scale = Math.min(1, MAX_WIDTH / canvas.width);
        tmp.width = Math.round(canvas.width * scale);
        tmp.height = Math.round(canvas.height * scale);
        const tctx = tmp.getContext('2d');
        tctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, tmp.width, tmp.height);

        try {
            // Guardamos dataURL directo (más simple y rápido que FileReader)
            sessionStorage.setItem('captured_image', tmp.toDataURL('image/jpeg', QUALITY));
        } catch (e) {
            console.warn('No se pudo guardar la imagen en sessionStorage:', e);
        }

        // Ahora creamos el blob optimizado y redirigimos
        tmp.toBlob(blob => {
            // Si hay coords cacheadas usamos la redirección con analizando
            if (cachedCoords) {
                window.location.href = `/mapa/?analizando=1&userlat=${encodeURIComponent(cachedCoords.lat)}&userlon=${encodeURIComponent(cachedCoords.lon)}`;
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        window.location.href = `/mapa/?analizando=1&userlat=${encodeURIComponent(pos.coords.latitude)}&userlon=${encodeURIComponent(pos.coords.longitude)}`;
                    },
                    err => {
                        console.warn('Geolocalización falló en captura:', err);
                        window.location.href = `/mapa/?analizando=1`;
                    },
                    { enableHighAccuracy: true, timeout: 7000 }
                );
            } else {
                window.location.href = `/mapa/?analizando=1`;
            }
        }, 'image/jpeg', QUALITY);
    })();
};
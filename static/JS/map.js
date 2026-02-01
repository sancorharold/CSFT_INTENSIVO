let map;
let userMarker = null;
let currentRiskLayer = null; 
let markers = []; 

// Destinos Turísticos (Ejemplo)
const destinations = [];

// Límites de Ecuador
const ECUADOR_BOUNDS = L.latLngBounds(
    [-5.2, -81.5],  // Suroeste
    [2.5, -75.0]    // Noreste
);

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    initMap();
});

function initMap() {
    // 1. Configurar Mapa (Vista por defecto: Centro de Ecuador)
    // Esto es el "fallback" por si el usuario no da permisos de ubicación
    map = L.map("map", {
        maxBounds: ECUADOR_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 6,
        maxZoom: 18
    }).setView([-1.83, -78.18], 7); 

    // 2. Capa Base
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // 3. Cargar Destinos (si existen)
    destinations.forEach(d => {
        const marker = L.marker([d.lat, d.lng]).addTo(map);
        marker.bindPopup(`<strong>${d.name}</strong><br>${d.location}<br><b>${d.price}</b>`);
        markers.push({ name: d.name.toLowerCase(), marker: marker });
    });

    // 4. Leaflet fix
    setTimeout(() => { map.invalidateSize(); }, 200);

    // 5. EVENTO CLIC: CONSULTAR RIESGO MANUAL
    map.on('click', function(e) {
        obtenerRiesgo(e.latlng.lat, e.latlng.lng);
    });

    // 6. Configurar Controles manuales
    setupControls();

    // --- GEOLOCALIZACIÓN O CENTRADO POR PARÁMETROS (incluye flujo 'analizando') ---
    const urlParams = new URLSearchParams(window.location.search);
    const analizando = urlParams.get('analizando');
    const targetLat = urlParams.get('lat');
    const targetLon = urlParams.get('lon');
    const sitioName = urlParams.get('sitio');

    // Utility: crear overlay de análisis
    function showAnalyzingOverlay(text) {
        let overlay = document.getElementById('analyzingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'analyzingOverlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.color = '#fff';
            overlay.style.zIndex = 9999;
            overlay.style.fontSize = '18px';
            overlay.innerHTML = `<div style="text-align:center;"><div class="spinner" style="margin-bottom:12px"></div><div>${text}</div></div>`;
            const mapEl = document.getElementById('map');
            mapEl.style.position = 'relative';
            mapEl.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
            overlay.innerHTML = `<div style="text-align:center;"><div class="spinner" style="margin-bottom:12px"></div><div>${text}</div></div>`;
        }
    }

    function hideAnalyzingOverlay() {
        const overlay = document.getElementById('analyzingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    if (analizando === '1' || analizando === 'true') {
        showAnalyzingOverlay('Analizando foto...');
        const imageData = sessionStorage.getItem('captured_image');
        const userLat = urlParams.get('userlat');
        const userLon = urlParams.get('userlon');

        let analysisTimer = null;
        const TIMEOUT_MS = 10000; // 10s
        let lastLat = null, lastLon = null;

        function startTimeout(lat, lon) {
            clearTimeout(analysisTimer);
            analysisTimer = setTimeout(() => {
                const overlay = document.getElementById('analyzingOverlay');
                if (overlay) {
                    overlay.innerHTML = `<div style="text-align:center;"><div class="spinner" style="margin-bottom:12px"></div><div>Esto está tardando. <button id="retryAnalyze" style="margin-top:10px;padding:8px 12px;border-radius:6px;border:none;background:#0b78ff;color:#fff;cursor:pointer;">Reintentar</button></div></div>`;
                    const btn = document.getElementById('retryAnalyze');
                    if (btn) {
                        btn.onclick = () => {
                            showAnalyzingOverlay('Reintentando...');
                            uploadImageWithCoords(lastLat, lastLon);
                        };
                    }
                }
            }, TIMEOUT_MS);
        }

        function clearAnalysisTimeout() {
            if (analysisTimer) {
                clearTimeout(analysisTimer);
                analysisTimer = null;
            }
        }

        function uploadImageWithCoords(lat, lon) {
            lastLat = lat; lastLon = lon;
            showAnalyzingOverlay('Analizando foto...');
            startTimeout(lat, lon);

            if (!imageData) {
                clearAnalysisTimeout();
                hideAnalyzingOverlay();
                alert('No se encontró la imagen capturada. Intenta nuevamente.');
                return;
            }

            // Convert dataURL a Blob
            fetch(imageData)
                .then(r => r.blob())
                .then(blob => {
                    const fd = new FormData();
                    fd.append('imagen', blob, 'foto.jpg');
                    if (lat && lon) {
                        fd.append('lat', lat);
                        fd.append('lon', lon);
                    }

                    return fetch('/turismo/recomendar/', { method: 'POST', body: fd });
                })
                .then(res => res.json())
                .then(data => {
                    clearAnalysisTimeout();
                    sessionStorage.removeItem('captured_image');
                    hideAnalyzingOverlay();

                    // Mostrar nombre del lugar recomendado si está disponible
                    if (data.nombre) {
                        const distancia = data.distancia_km ? ` (${data.distancia_km} km)` : '';
                        alert("Lugar recomendado: " + data.nombre + distancia);
                    }

                    if (data.mensaje) {
                        alert(data.mensaje);
                    }

                    if (data.lat && data.lon) {
                        const lat = parseFloat(data.lat);
                        const lon = parseFloat(data.lon);
                        const siteMarker = L.marker([lat, lon]).addTo(map).bindPopup(data.nombre || 'Ubicación recomendada');
                        obtenerRiesgo(lat, lon);

                        if (userLat && userLon) {
                            const ulat = parseFloat(userLat);
                            const ulon = parseFloat(userLon);
                            if (!isNaN(ulat) && !isNaN(ulon)) {
                                const userMarker = L.marker([ulat, ulon]).addTo(map).bindPopup('Tu ubicación');
                                map.fitBounds([[lat, lon], [ulat, ulon]], { padding: [60, 60] });
                                siteMarker.openPopup();
                                userMarker.openPopup();
                                return;
                            }
                        }

                        map.setView([lat, lon], 15);
                        siteMarker.openPopup();
                    } else {
                        // Si la API no devolvió coordenadas, intentar centrar en la ubicación del usuario
                        if (userLat && userLon) {
                            const ulat = parseFloat(userLat);
                            const ulon = parseFloat(userLon);
                            if (!isNaN(ulat) && !isNaN(ulon)) {
                                map.setView([ulat, ulon], 15);
                                L.marker([ulat, ulon]).addTo(map).bindPopup('Tu ubicación').openPopup();
                            }
                        }
                    }
                })
                .catch(err => {
                    clearAnalysisTimeout();
                    console.error(err);
                    sessionStorage.removeItem('captured_image');
                    hideAnalyzingOverlay();
                    alert('Error al procesar la imagen. Intenta nuevamente.');
                });
        }

        if (userLat && userLon) {
            uploadImageWithCoords(userLat, userLon);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => uploadImageWithCoords(pos.coords.latitude, pos.coords.longitude),
                err => {
                    // Si falla la geoloc, subimos la imagen sin coords y el servidor podrá decidir
                    uploadImageWithCoords(null, null);
                },
                { enableHighAccuracy: true, timeout: 7000 }
            );
        } else {
            uploadImageWithCoords(null, null);
        }

        return;
    }

    if (targetLat && targetLon) {
        const lat = parseFloat(targetLat);
        const lon = parseFloat(targetLon);
        const userLat = urlParams.get('userlat');
        const userLon = urlParams.get('userlon');

        if (!isNaN(lat) && !isNaN(lon)) {
            // Mostrar marcador del sitio recomendado
            const siteMarker = L.marker([lat, lon]).addTo(map).bindPopup(sitioName ? sitioName : "Ubicación recomendada");
            // Notificación con nombre si viene por querystring
            if (sitioName) {
                alert("Lugar recomendado: " + sitioName);
            }
            obtenerRiesgo(lat, lon);

            // Si el front-end mandó la ubicación del usuario, la mostramos y ajustamos bounds
            if (userLat && userLon) {
                const ulat = parseFloat(userLat);
                const ulon = parseFloat(userLon);
                if (!isNaN(ulat) && !isNaN(ulon)) {
                    const userMarker = L.marker([ulat, ulon]).addTo(map).bindPopup("Tu ubicación");
                    // Ajustar vista para contener ambos puntos con padding
                    map.fitBounds([[lat, lon], [ulat, ulon]], { padding: [60, 60] });
                    siteMarker.openPopup();
                    userMarker.openPopup();
                    return;
                }
            }

            // Si no hay user coords, hacemos un setView al sitio
            map.setView([lat, lon], 15);
            siteMarker.openPopup();
        }
    } else {
        detectarUbicacionInicial();
    }
}

// Función dedicada a detectar la ubicación al cargar
function detectarUbicacionInicial() {
    const loadingScreen = document.getElementById("mapLoading");
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Verificar si está dentro de Ecuador
                if (ECUADOR_BOUNDS.contains([lat, lng])) {
                    // ZOOM AUTOMÁTICO A LA ZONA (Nivel 15 es nivel calle/barrio)
                    map.setView([lat, lng], 15);

                    // Colocar marcador de usuario
                    if (userMarker) userMarker.setLatLng([lat, lng]);
                    else userMarker = L.marker([lat, lng]).addTo(map);
                    
                    userMarker.bindPopup("<b>Estás aquí</b>").openPopup();

                    // AUTOMÁTICAMENTE MOSTRAR EL RIESGO (ZONA DE CALOR)
                    obtenerRiesgo(lat, lng);
                } else {
                    console.log("Usuario fuera de Ecuador");
                }
                
                // Ocultar carga
                if (loadingScreen) loadingScreen.style.display = "none";
            },
            (error) => {
                console.warn("No se pudo obtener ubicación o permiso denegado:", error);
                // Si falla, solo ocultamos la carga y dejamos la vista general
                if (loadingScreen) loadingScreen.style.display = "none";
            },
            {
                enableHighAccuracy: true, // Tratar de usar GPS para mejor precisión
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        console.log("Geolocalización no soportada");
        if (loadingScreen) loadingScreen.style.display = "none";
    }
}

// --- LÓGICA DE RIESGO (IA + DJANGO) ---
function obtenerRiesgo(lat, lng) {
    if (currentRiskLayer) {
        map.removeLayer(currentRiskLayer);
    }

    // Popup temporal
    var popup = L.popup()
        .setLatLng([lat, lng])
        .setContent('<div class="spinner"></div> Analizando zona...')
        .openOn(map);

    fetch(`/riesgo/api/calcular/?lat=${lat}&lng=${lng}`)
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success'){
                var contenido = `
                    <div style="text-align:center; min-width:160px;">
                        <h4 style="color:${data.color}; margin:0;">Riesgo: ${data.nivel_riesgo}/10</h4>
                        <hr style="margin:5px 0; opacity:0.2;">
                        <p style="font-size:13px; margin:5px 0;">${data.mensaje}</p>
                    </div>
                `;

                // Dibujamos el círculo (ZONA DE CALOR)
                currentRiskLayer = L.circle([lat, lng], {
                    color: data.color,
                    fillColor: data.color,
                    fillOpacity: 0.3,
                    radius: 500 // Radio de 500m
                }).addTo(map);

                popup.setContent(contenido);
            } else {
                popup.setContent("Sin datos en esta zona.");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            popup.setContent("Error de conexión.");
        });
}

// --- CONTROLES Y BUSCADOR ---
function setupControls() {
    document.getElementById("zoomIn").onclick = () => map.zoomIn();
    document.getElementById("zoomOut").onclick = () => map.zoomOut();

    // Botón manual de "Mi Ubicación" (Reutiliza la lógica)
    document.getElementById("myLocation").onclick = () => {
        document.getElementById("mapLoading").style.display = "flex"; // Mostrar carga visualmente
        detectarUbicacionInicial();
    };

    const searchInput = document.getElementById("mapSearch");
    if(searchInput) {
        searchInput.addEventListener("input", e => {
            const value = e.target.value.toLowerCase();
            const found = destinations.find(d => d.name.toLowerCase().includes(value));
            if (found) {
                map.setView([found.lat, found.lng], 15); // Zoom alto también al buscar
                markers.find(m => m.name === found.name.toLowerCase())?.marker.openPopup();
            }
        });
    }
}
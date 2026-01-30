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

    // --- NUEVO: GEOLOCALIZACIÓN AUTOMÁTICA AL INICIO ---
    detectarUbicacionInicial();
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
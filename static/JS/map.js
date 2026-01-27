let map;
let userMarker = null;

// Destinos
const destinations = [];

// INIT
window.addEventListener("load", () => {
    initMap();
});

// MAP INIT
// INIT
window.addEventListener("load", () => {
    initMap();
});

// MAP INIT
function initMap() {
    map = L.map("map").setView([-15, -60], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap"
    }).addTo(map);

    destinations.forEach(d => {
        const marker = L.marker([d.lat, d.lng]).addTo(map);

        marker.bindPopup(`
            <strong>${d.name}</strong><br>
            ${d.location}<br>
            <b>${d.price}</b>
        `);

        
        markers.push({
            name: d.name.toLowerCase(),
            marker: marker
        });
    });

    document.getElementById("mapLoading").style.display = "none";

    // Leaflet fix
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
}

// CONTROLS
document.getElementById("zoomIn").onclick = () => map.zoomIn();
document.getElementById("zoomOut").onclick = () => map.zoomOut();

document.getElementById("myLocation").onclick = () => {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            map.setView([lat, lng], 14);

            // Si ya existe el marcador, muévelo
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
            } else {
                // Si no existe, créalo
                userMarker = L.marker([lat, lng]).addTo(map);
                userMarker.bindPopup("tú ubicación").openPopup();
            }
        },
        () => {
            alert("No se pudo obtener tu ubicación");
        }
    );
};

// SEARCH
document.getElementById("mapSearch").addEventListener("input", e => {
    const value = e.target.value.toLowerCase();
    const found = destinations.find(d =>
        d.name.toLowerCase().includes(value)
    );
    if (found) {
        map.setView([found.lat, found.lng], 6);
    }
});
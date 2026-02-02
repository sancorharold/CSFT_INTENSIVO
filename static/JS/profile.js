// --- SELECTORES DEL MODAL DE CÁMARA ---
const fabCamera = document.getElementById('fabCamera');
const cameraModal = document.getElementById('cameraModal');
const closeModal = document.getElementById('closeModal');

const activateCameraBtn = document.getElementById('activateCamera');
const uploadPhotoBtn = document.getElementById('uploadPhoto');
const fileInput = document.getElementById('fileInput');

const videoElement = document.getElementById('videoElement');
const capturedImage = document.getElementById('capturedImage');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');

const cameraControls = document.getElementById('cameraControls');
const captureBtn = document.getElementById('captureBtn');
const actionButtons = document.getElementById('actionButtons');
const retakeBtn = document.getElementById('retakeBtn');
const saveBtn = document.getElementById('saveBtn');

let stream = null;

// --- FUNCIONES DEL MODAL ---

// Abrir el modal
if (fabCamera) {
    fabCamera.addEventListener('click', () => {
        cameraModal.classList.add('active');
    });
}

// Cerrar el modal
if (closeModal) {
    closeModal.addEventListener('click', () => {
        cameraModal.classList.remove('active');
        // Detener la cámara si está activa al cerrar
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        resetModalState();
    });
}

// Función para resetear el estado del modal a su vista inicial
function resetModalState() {
    videoElement.classList.remove('active');
    capturedImage.classList.remove('active');
    cameraPlaceholder.style.display = 'block';
    captureBtn.classList.remove('active');
    actionButtons.classList.remove('active');
    cameraControls.style.display = 'flex';
}

// --- LÓGICA DE LA CÁMARA ---

// 1. Activar la cámara del dispositivo
activateCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoElement.srcObject = stream;
        videoElement.classList.add('active');
        cameraPlaceholder.style.display = 'none';
        cameraControls.style.display = 'none';
        captureBtn.classList.add('active');
    } catch (err) {
        console.error("Error al acceder a la cámara: ", err);
        alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
    }
});

// 2. Simular clic en el input de archivo para subir foto
uploadPhotoBtn.addEventListener('click', () => {
    fileInput.click();
});

// Cuando se selecciona un archivo
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            capturedImage.src = e.target.result;
            capturedImage.classList.add('active');
            cameraPlaceholder.style.display = 'none';
            cameraControls.style.display = 'none';
            actionButtons.classList.add('active');
        };
        reader.readAsDataURL(file);
    }
});

// 3. Tomar la foto desde el stream de video
captureBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    capturedImage.src = canvas.toDataURL('image/jpeg');
    capturedImage.classList.add('active');
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    videoElement.classList.remove('active');
    captureBtn.classList.remove('active');
    actionButtons.classList.add('active');
});

// 4. Volver a tomar la foto
retakeBtn.addEventListener('click', () => {
    resetModalState();
});

// 5. Guardar la foto (Lógica de ejemplo)
saveBtn.addEventListener('click', () => {
    const incrementUrl = document.body.dataset.incrementPhotoUrl;

    fetch(incrementUrl, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Si se desbloqueó un logro, mostrar una notificación
            if (data.unlocked_achievement) {
                showToast(`🎉 ¡Logro desbloqueado: ${data.unlocked_achievement.title}!`);
            }
            
            // Cerrar el modal
            closeModal.click();

            // Recargar la página para que el usuario vea el contador actualizado.
            // Una mejora sería actualizar el DOM directamente sin recargar.
            setTimeout(() => {
                window.location.reload();
            }, 800); // Pequeña espera para que el usuario vea el toast

        } else {
            alert('Hubo un error al guardar la foto.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Hubo un error de conexión.');
    });
});

// --- FUNCIONES AUXILIARES ---

// Función para obtener el CSRF token de las cookies de Django
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

// Función para mostrar una notificación temporal (toast)
function showToast(mensaje) {
    const toast = document.createElement("div");
    toast.innerText = mensaje;
    toast.className = 'toast-notification'; // Usaremos una clase para darle estilo
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
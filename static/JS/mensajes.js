// Inicializamos los chats con los datos que vienen del backend (inyectados en el HTML)
let chats = window.djangoChats || [];
console.log("Chats cargados:", chats);
let currentChat = null;

/* RENDER CHAT LIST */
function renderChats(){
  const list = document.getElementById("chat-list");
  list.innerHTML = "";
  
  if (chats.length === 0) {
      list.innerHTML = "<div style='padding:20px; text-align:center; color:#777;'>No tienes conversaciones aún.</div>";
      return;
  }

  chats.forEach(c => {
    // Usamos c.last_msg que preparamos en la vista para evitar errores si no hay mensajes
    const lastMsg = c.last_msg || "Sin mensajes";
    
    list.innerHTML += `
      <div class="chat-item" onclick="openChat(${c.id})">
        <div class="avatar">${c.avatar}</div>
        <div class="chat-info">
          <b>${c.name}</b><br>
          <small>${lastMsg}</small>
        </div>
        ${c.unread ? `<div class="badge">${c.unread}</div>` : ""}
      </div>
    `;
  });
}

/* OPEN CHAT */
function openChat(id){
  currentChat = chats.find(c => c.id === id);
  currentChat.unread = 0; // Visualmente marcamos como leído
  
  document.getElementById("chat-list").classList.remove("active");
  document.getElementById("chat-view").classList.add("active");
  document.getElementById("chat-name").innerText = currentChat.name;
  document.getElementById("main-header").style.display = 'none'; // Ocultar header principal en vista chat
  renderMessages();
}

/* RENDER MESSAGES */
function renderMessages(){
  const box = document.getElementById("messages");
  box.innerHTML = "";
  currentChat.messages.forEach(m => {
    box.innerHTML += `
      <div class="msg ${m.from}">
        ${m.image ? `<img src="${m.image}" class="chat-img" onclick="openLightbox(this.src)">` : ""}
        ${m.text ? `<div>${m.text}</div>` : ""}
        <small class="msg-time">${m.time || ""}</small>
      </div>
    `;
  });
  box.scrollTop = box.scrollHeight;
}

/* SEND TEXT */
function sendText(){
  const input = document.getElementById("textInput");
  const text = input.value.trim();
  if(!text) return;

  // 1. Actualización Optimista (UI)
  currentChat.messages.push({from: "me", text: text, time: getCurrentTime()});
  currentChat.last_msg = text; // Actualizar preview
  input.value = "";
  renderMessages();

  // 2. Enviar al Servidor (AJAX)
  // Asumimos que la URL es /accounts/conversation/<id>/
  // Necesitamos el token CSRF
  const csrfToken = getCookie('csrftoken');

  fetch(`/accounts/conversation/${currentChat.id}/`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ text: text })
  })
  .then(response => {
      if (!response.ok) console.error("Error enviando mensaje");
  })
  .catch(err => console.error(err));
}

/* SEND IMAGE */
function sendImage(){
  const input = document.getElementById("imageInput");
  const file = input.files[0];
  if(!file) return;

  const formData = new FormData();
  formData.append('image', file);
  // formData.append('text', ""); // Opcional si quieres enviar texto con la foto

  // Optimistic UI (Preview local)
  const reader = new FileReader();
  reader.onload = function(e){
      currentChat.messages.push({from: "me", text: "", image: e.target.result, time: getCurrentTime()});
      renderMessages();
  }
  reader.readAsDataURL(file);

  fetch(`/accounts/conversation/${currentChat.id}/`, {
      method: 'POST',
      headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'X-Requested-With': 'XMLHttpRequest'
      },
      body: formData
  })
  .then(res => { if(!res.ok) console.error("Error enviando imagen"); })
  .finally(() => { input.value = ""; }); // Limpiar input
}

/* EMOJIS */
function toggleEmojis(){
  const p = document.getElementById("emoji-panel");
  p.style.display = p.style.display === "block" ? "none" : "block";
}

document.querySelectorAll("#emoji-panel span").forEach(e => {
  e.onclick = () => document.getElementById("textInput").value += e.innerText;
});

/* BACK */
function goBack(){
  document.getElementById("chat-view").classList.remove("active");
  document.getElementById("chat-list").classList.add("active");
  document.getElementById("main-header").style.display = 'block';
  renderChats(); // Re-renderizar para actualizar el último mensaje
}

/* LIGHTBOX */
function openLightbox(src){
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  lb.classList.add("active");
}

function closeLightbox(){
  document.getElementById("lightbox").classList.remove("active");
}

/* HELPER: Get Cookie */
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

/* HELPER: Get Current Time HH:MM */
function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
}

/* TYPING INDICATOR LOGIC */
let typingTimeout = null;

function sendTypingSignal() {
    // Limitamos el envío a una vez cada 2 segundos para no saturar el servidor
    if (typingTimeout) return;
    typingTimeout = setTimeout(() => typingTimeout = null, 2000);

    fetch(`/accounts/conversation/${currentChat.id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ action: 'typing' })
    }).catch(e => console.error(e));
}

// Inicialización segura cuando el HTML ha cargado
document.addEventListener("DOMContentLoaded", () => {
    const textInput = document.getElementById("textInput");
    if (textInput) {
        textInput.addEventListener("input", sendTypingSignal);
    }
    renderChats();
    startPolling();
});

/* REAL-TIME POLLING */
// Consultamos al servidor cada 3 segundos para ver si hay mensajes nuevos
function startPolling() {
  setInterval(() => {
  // Usamos la misma URL de la vista actual
  fetch(window.location.href, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
  .then(response => response.json())
  .then(newChats => {
      // 1. Si hay un chat abierto, verificamos si hay mensajes nuevos
      if (currentChat) {
          const updatedChat = newChats.find(c => c.id === currentChat.id);
          if (updatedChat) {
              // Actualizar indicador de escribiendo
              const indicator = document.getElementById("typing-indicator");
              if (updatedChat.is_typing) {
                  indicator.style.display = "block";
              } else {
                  indicator.style.display = "none";
              }

              const oldLen = currentChat.messages.length;
              const newLen = updatedChat.messages.length;

              // Si el servidor tiene más mensajes que nosotros, actualizamos
              if (newLen > oldLen) {
                  // Obtenemos solo los mensajes nuevos
                  const newMessages = updatedChat.messages.slice(oldLen);
                  const box = document.getElementById("messages");
                  
                  // Detectar si el usuario está cerca del final (margen de 100px) antes de agregar contenido
                  const isAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
                  
                  newMessages.forEach(m => {
                      // Agregamos visualmente
                      box.innerHTML += `
                        <div class="msg ${m.from}">
                            ${m.image ? `<img src="${m.image}" class="chat-img" onclick="openLightbox(this.src)">` : ""}
                            ${m.text ? `<div>${m.text}</div>` : ""}
                            <small class="msg-time">${m.time || ""}</small>
                        </div>`;
                  });
                  
                  // Scroll al final SOLO si el usuario ya estaba al final
                  if (isAtBottom) {
                      box.scrollTop = box.scrollHeight;
                  }
                  
                  // Sincronizamos nuestra referencia local
                  currentChat.messages = updatedChat.messages;
              }
          }
      }

      // 2. Actualizamos la lista global (para badges y últimos mensajes en la lista)
      chats = newChats;

      // Si NO estamos dentro de un chat (estamos viendo la lista), renderizamos la lista
      if (!document.getElementById("chat-view").classList.contains("active")) {
          renderChats();
      }
  })
  .catch(err => console.error("Error actualizando chats:", err));
  }, 3000);
}
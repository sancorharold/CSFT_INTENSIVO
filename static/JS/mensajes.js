// Solo mantenemos la lógica de renderizar la lista y redireccionar
let chats = window.djangoChats || [];

function renderChats(){
  const list = document.getElementById("chat-list");
  if (!list) return; // Seguridad para evitar errores si el elemento no existe
  
  list.innerHTML = "";
  
  if (chats.length === 0) {
      list.innerHTML = "<div style='padding:20px; text-align:center; color:#777;'>No tienes conversaciones aún.</div>";
      return;
  }

  chats.forEach(c => {
    const lastMsg = c.last_msg || "Sin mensajes";
    list.innerHTML += `
      <div class="chat-item" onclick="openChat(${c.id})" style="cursor:pointer; padding:15px; border-bottom:1px solid #eee; display:flex; align-items:center;">
        <div class="avatar" style="width:40px; height:40px; background:#ddd; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:15px;">👤</div>
        <div class="chat-info">
          <b style="color: black;">${c.name}</b><br>
          <small style="color: #666;">${lastMsg}</small>
        </div>
      </div>
    `;
  });
}

// ESTA ES LA FUNCIÓN CLAVE: Ahora solo cambia de página
function openChat(id){
    console.log("Redireccionando al chat del usuario:", id);
    window.location.href = `/accounts/messages/chat/${id}/`;
}

// Ejecutar al cargar
document.addEventListener("DOMContentLoaded", renderChats);
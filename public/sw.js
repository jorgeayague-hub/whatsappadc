// sw.js — Service worker: recibe la notificación push del servidor
// y la muestra en el celular, aunque el panel esté cerrado.

self.addEventListener("push", (event) => {
  let data = { titulo: "Aires de Cuyo", cuerpo: "Tenés un mensaje nuevo", url: "/dashboard.html" };
  try {
    data = event.data.json();
  } catch (e) {
    // Si por algún motivo no viene JSON, se usa el mensaje por defecto de arriba.
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.cuerpo,
      icon: "logo.png",
      badge: "logo.png",
      data: { url: data.url || "/dashboard.html" },
    })
  );
});

// Al tocar la notificación, abre (o enfoca) el panel directo en ese chat.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes("/dashboard.html") && "focus" in cliente) {
          return cliente.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

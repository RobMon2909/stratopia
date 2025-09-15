// client/public/sw.js

self.addEventListener('push', function(event) {
  const data = event.data.json();
  const title = data.title || 'Stratopia';
  const options = {
    body: data.body,
    // Puedes añadir un icono que también debe estar en la carpeta 'public'
    // icon: '/icon-192x192.png', 
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Esta lógica se puede mejorar para abrir la URL de la notificación
  event.waitUntil(clients.openWindow('/'));
});
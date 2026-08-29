// Service Worker for Firebase Cloud Messaging & Background Push Notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.notification?.title || data.title || 'Vortex Esports Notification';
      const options = {
        body: data.notification?.body || data.body || 'You have a new update in Vortex Esports.',
        icon: data.notification?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: data.data || {}
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Vortex Esports', {
          body: text,
          vibrate: [200, 100, 200]
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

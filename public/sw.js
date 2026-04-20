// Service Worker for Push Notifications - Fábrica de Leoas
self.addEventListener('push', (event) => {
  let data = { title: 'Fábrica de Leoas 🦁', body: '', url: '/dashboard' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    data.body = event.data?.text() || '';
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'fabrica-leoas',
    renotify: true,
    data: {
      url: data.url || '/dashboard',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window of our app
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          try {
            client.navigate(urlToOpen);
            return client.focus();
          } catch (e) {
            // navigate may be unavailable on some browsers; fall through
          }
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Cook AI';
  const options = {
    body: payload.body || 'Você recebeu uma nova notificação.',
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    data: {
      ...(payload.data || {}),
      url: payload.url || (payload.data && payload.data.url) || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

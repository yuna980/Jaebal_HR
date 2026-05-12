self.addEventListener('push', (event) => {
  let payload = {
    title: '야구없인못살아',
    body: '새 알림이 도착했어요.',
    url: '/dashboard',
    tag: 'yagu-eobsin-motsara-notification',
  };

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json(),
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: {
        url: payload.url,
      },
      icon: '/team-logos/ssg-small.png',
      badge: '/team-logos/ssg-small.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url ?? '/dashboard', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url === targetUrl) {
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

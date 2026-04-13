self.addEventListener('push', function(event) {
  if (event.data) {
    const pushData = event.data.json();
    const notificationTitle = pushData.title || 'New Notification';
    const notificationOptions = {
      body: pushData.message || pushData.body || 'You have a new message',
      icon: '/vite.svg', // Assuming standard vite icon
      data: pushData.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

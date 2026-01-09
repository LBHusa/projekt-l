// ============================================
// Projekt L - Service Worker for Push Notifications
// Version: 3.0 - Habit Reminders with Actions
// ============================================

// Handle push events from the server
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let data = {
    title: 'Projekt L',
    body: 'Du hast eine neue Benachrichtigung',
    url: '/'
  };

  // Try to parse the push data
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  // Build notification options
  const options = {
    body: data.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      type: data.data?.type || 'general',
      habitId: data.data?.habitId,
      reminderId: data.data?.reminderId,
      dateOfArrival: Date.now(),
    },
    tag: data.tag || 'projekt-l-notification',
    renotify: data.renotify || false,
    requireInteraction: data.data?.type === 'habit_reminder', // Keep on screen until interaction
  };

  // Add action buttons for habit reminders
  if (data.data?.type === 'habit_reminder') {
    options.actions = [
      {
        action: 'complete',
        title: '✅ Erledigt',
        icon: '/icon-192.svg',
      },
      {
        action: 'snooze',
        title: '⏰ Später',
        icon: '/icon-192.svg',
      },
      {
        action: 'view',
        title: '👁️ Ansehen',
        icon: '/icon-192.svg',
      },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const notificationData = event.notification.data;
  const action = event.action;

  // Handle habit reminder actions
  if (notificationData.type === 'habit_reminder') {
    event.waitUntil(
      handleHabitReminderAction(action, notificationData)
    );
    return;
  }

  // Default: open URL
  const urlToOpen = notificationData.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(urlToOpen);
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Handle habit reminder notification actions
 */
async function handleHabitReminderAction(action, data) {
  const { habitId, reminderId } = data;

  if (action === 'complete') {
    // Complete the habit
    await fetch('/api/habits/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, reminderId }),
    });

    // Navigate to habits page
    const client = await openOrFocusWindow('/habits');
    if (client) {
      client.postMessage({ type: 'HABIT_COMPLETED', habitId });
    }
  } else if (action === 'snooze') {
    // Snooze for 1 hour (re-schedule notification)
    await fetch('/api/reminders/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderId, snoozeMinutes: 60 }),
    });
  } else {
    // View habit details
    await openOrFocusWindow(`/habits?highlight=${habitId}`);
  }

  // Log action taken
  await fetch('/api/reminders/log-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reminderId,
      habitId,
      action: action || 'viewed',
    }),
  });
}

/**
 * Open or focus existing window
 */
async function openOrFocusWindow(url) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      client.focus();
      await client.navigate(url);
      return client;
    }
  }

  if (clients.openWindow) {
    return await clients.openWindow(url);
  }

  return null;
}

// Handle notification close (dismissed without action)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');

  const notificationData = event.notification.data;

  if (notificationData.type === 'habit_reminder') {
    // Log dismissal
    fetch('/api/reminders/log-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reminderId: notificationData.reminderId,
        habitId: notificationData.habitId,
        action: 'dismissed',
      }),
    }).catch(err => console.error('[SW] Error logging dismissal:', err));
  }
});

// Service Worker install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Service Worker activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

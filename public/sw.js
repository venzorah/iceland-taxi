/* Message alerts only. Do not cache pages, API responses, or message bodies. */

self.addEventListener('push', (event) => {
  let data = {
    title: 'Iceland Taxi Booking',
    body: 'You have a new message',
    url: '/messages',
    id: '',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = {
        title: typeof parsed.title === 'string' ? parsed.title : data.title,
        body: typeof parsed.body === 'string' ? parsed.body : data.body,
        url: typeof parsed.url === 'string' ? parsed.url : data.url,
        id: typeof parsed.id === 'string' ? parsed.id : '',
      }
    }
  } catch {
    /* keep the generic copy */
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const visible = windows.some((client) => client.visibilityState === 'visible')
      windows.forEach((client) => {
        client.postMessage({ type: 'message-push', title: data.title, body: data.body, url: data.url, id: data.id })
      })
      if (visible) return
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.id ? `message-${data.id}` : 'message-alert',
        renotify: true,
        silent: false,
        sound: '/sounds/message.wav',
        data: { url: data.url },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/messages'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        client.postMessage({ type: 'message-alert-navigate', url })
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

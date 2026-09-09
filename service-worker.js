/* DB-MEG-FORMS v2026.09.09-18:00 service worker
   Online-first PWA + Web Push notification handling. */
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data ? event.data.text() : '' }; }

  const title = payload.title || 'MEG-FORMS';
  const options = {
    body: payload.body || 'A form needs your attention.',
    icon: payload.icon || 'icon-180.png',
    badge: payload.badge || 'favicon-32.png',
    tag: payload.tag || 'meg-forms-action',
    renotify: !!payload.renotify,
    data: {
      url: payload.url || './',
      form_code: payload.form_code || '',
      submission_id: payload.submission_id || ''
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil((async()=>{
    const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for(const client of windows){
      try{
        const u = new URL(client.url);
        if(u.origin === self.location.origin){
          await client.focus();
          if('navigate' in client) await client.navigate(target);
          return;
        }
      }catch{}
    }
    if(self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

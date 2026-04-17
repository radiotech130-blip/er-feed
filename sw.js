/* ER Feed Service Worker */
const CACHE_NAME = 'er-feed-v1';
const SUPABASE_URL = 'https://kgcpfjplwxgqhxoohxsl.supabase.co';

/* ── キャッシュするファイル ── */
const CACHE_FILES = ['/', '/index.html', '/manifest.json'];

/* インストール時にキャッシュ */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

/* 古いキャッシュを削除 */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* ネットワーク優先・キャッシュフォールバック */
self.addEventListener('fetch', function(e) {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request);
    })
  );
});

/* ── Push通知受信 ── */
self.addEventListener('push', function(e) {
  if(!e.data) return;
  let data;
  try { data = e.data.json(); } catch(err) { data = { title:'ER Feed', body: e.data.text() }; }

  const title   = data.title || 'ER Feed';
  const options = {
    body:    data.body    || '新しい通知があります',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    tag:     data.tag     || 'er-feed',
    data:    { url: data.url || '/' },
    actions: data.urgent ? [
      { action: 'ack', title: '確認しました' }
    ] : [],
    requireInteraction: !!data.urgent,
    vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

/* 通知タップで画面を開く */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for(var i = 0; i < list.length; i++) {
        if(list[i].url.includes(url) && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Generic placeholder service worker (optional)
// Your app uses firebase-messaging-sw.js for push. Some browsers or tooling may request /sw.js.
// We keep this minimal to avoid 404 errors.
self.addEventListener('install', () => {
  // Skip waiting so it becomes active quickly
  if (self.skipWaiting) self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  // Claim clients so pages see a controlled SW if they expected /sw.js
  event.waitUntil(self.clients.claim())
})

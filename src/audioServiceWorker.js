// audio-service-worker.js
let audioState = {
  isPlaying: false,
  isMuted: false,
  currentTime: 0,
  volume: 1.0,  // Add volume to state
  lastUpdateTime: Date.now()
};
  
  self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('./src/assets/sport-rock-background-250761.mp3')) {
      event.respondWith(
        caches.open('audio-cache').then(cache => {
          return cache.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request).then(fetchedResponse => {
              cache.put(event.request, fetchedResponse.clone());
              return fetchedResponse;
            });
          });
        })
      );
    }
  });

  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener('message', (event) => {
    if (event.data.action === 'updateState') {
      audioState = { ...audioState, ...event.data.state, lastUpdateTime: Date.now() };
    } else if (event.data.action === 'getState') {
      if (audioState.isPlaying) {
        const elapsedTime = (Date.now() - audioState.lastUpdateTime) / 1000;
        audioState.currentTime += elapsedTime;
        audioState.lastUpdateTime = Date.now();
      }
      event.ports[0].postMessage(audioState);
    }
  });
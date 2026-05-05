// Service Worker for PWA offline support and push notifications
const CACHE_NAME = 'lingua-learn-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/main.tsx',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests, development server requests, and auth callback
    if (event.request.url.startsWith('http://localhost') || 
        event.request.url.startsWith('chrome-extension://') ||
        !event.request.url.startsWith(self.location.origin) ||
        event.request.url.includes('/auth/callback') ||
        event.request.url.includes('/callback')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request since fetch() consumes the request body
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response since it's a stream
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch((error) => {
                    console.log('Service Worker: Fetch failed', error);
                    // Return a basic offline response for HTML requests
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return new Response('<h1>Offline</h1><p>Please check your connection</p>', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/html'
                            })
                        });
                    }
                    throw error;
                });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'LinguaLearn';
    const options = {
        body: data.body || 'Time to practice! Keep your streak going 🔥',
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

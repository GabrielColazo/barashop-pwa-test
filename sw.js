// Service Worker de BaraShop
// Estrategia: cache-first SOLO para assets estáticos (CSS/JS/fuentes/íconos).
// Nunca cachea HTML ni llamadas a Supabase, para evitar mostrar datos viejos.

const CACHE_NAME = 'barashop-static-v1'; // ⚠️ subir el número (v2, v3...) en cada deploy grande de CSS/JS

const STATIC_ASSETS = [
  'css/main.css',
  'js/supabase.js',
  'js/auth.js',
  'js/anuncios.js',
  'assets/img/icons/icon-192.png',
  'assets/img/icons/icon-512.png',
  'assets/img/icons/icon-maskable-192.png',
  'assets/img/icons/icon-maskable-512.png'
];

// Instalación: precachea los assets base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // activa el nuevo SW sin esperar a que se cierren todas las pestañas
});

// Activación: borra caches viejos (de versiones anteriores del SW)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // toma control inmediato de las páginas abiertas
});

// Fetch: solo intercepta pedidos GET a nuestro propio dominio
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca tocar: Supabase, otros dominios externos, ni métodos que no sean GET
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  // Nunca cachear HTML: siempre red primero, para no mostrar contenido viejo
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Solo assets estáticos: cache-first, con fallback a red
  const isStaticAsset = STATIC_ASSETS.some((asset) => url.pathname.endsWith(asset));
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
  // Todo lo demás (imágenes de avisos, etc.) pasa directo a la red, sin cachear
});

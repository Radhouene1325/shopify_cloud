import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const swCode = `
const CACHE_NAME = 'platinumshop-v1';

// Helpers to identify third-party domains we must NEVER intercept
const isThirdParty = (hostname) => {
  const blocked = [
    'cdn.shopify.com',
    'monorail-edge.shopifysvc.com',
    'shopifysvc.com',
    'stripe.com',
    'paypal.com',
    'google-analytics.com',
    'googletagmanager.com',
  ];
  return blocked.some(d => hostname === d || hostname.endsWith('.' + d));
};

// Paths that must always go to network (admin, checkout, pay, wallets)
const isSensitivePath = (pathname) => {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.includes('/pay') ||
    pathname.includes('/wallets') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/account')
  );
};

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept sensitive paths or third-party analytics/payment domains
  if (isSensitivePath(url.pathname)) return;
  if (isThirdParty(url.hostname)) return;

  // Only cache static assets: style, script, font, image
  const allowedDestinations = ['style', 'script', 'font', 'image'];
  if (!allowedDestinations.includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      // Return cached version immediately if found
      if (cached) return cached;

      return fetch(request).then(response => {
        // Don't cache opaque responses, errors, or redirects
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        // Cache the new valid response in the background
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(request, clone))
          .catch(err => console.error('SW Cache Error:', err));

        return response;
      }).catch(err => {
        // Network failed and nothing in cache — let the browser handle the error
        console.error('SW Fetch Error:', err);
        throw err;
      });
    })
  );
});
  `;

  return new Response(swCode, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",  // Allows site-wide scope if you choose '/'
    },
  });
}
/* Bump BUILD whenever a deployed HTML, script, style, or built-in asset changes. */
'use strict';
const BUILD = '20261009-3';
const APP = new URL('./', self.location.href);
const CACHE_PREFIX = `pi-studio-static:${encodeURIComponent(APP.pathname)}:`;
const CACHE_NAME = CACHE_PREFIX + BUILD;
const FILES = [
  'index.html', 'mobile-demo.html',
  'styles.css', 'mobile.css', 'template.css', 'domestic.css', 'studio-ui.css',
  'pi-utils.js', 'domestic-template.js', 'pi-pdf.js', 'app.js', 'offline.js',
  'manifest.webmanifest', 'install.js', 'install.css', 'favicon.svg',
  'assets/zuosen-logo.jpeg', 'assets/zuosen-brand-square.jpg',
  'assets/zuosen-iso9001.png', 'assets/zuosen-authorized-signature.png',
  'assets/zuosen-company-seal.png', 'assets/zuosen-cn-seal.png',
  'assets/zhuoxin-cn-seal.png', 'assets/zuosen-domestic-logo.jpg',
  'assets/pwa-icon-192.png', 'assets/pwa-icon-512.png', 'assets/apple-touch-icon.png',
  'vendor/html2canvas-1.4.1.min.js', 'vendor/jspdf-4.2.1.min.js'
];
const URLS = FILES.map(file => new URL(file, APP).href);
const STATIC_PATHS = new Map(URLS.map(url => [new URL(url).pathname, url]));
STATIC_PATHS.set(APP.pathname, new URL('index.html', APP).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // addAll is one atomic batch: one failed resource rejects the install.
      await cache.addAll(URLS.map(url => {
        const fresh = new URL(url);
        fresh.searchParams.set('v', BUILD);
        return new Request(fresh.href, {cache:'reload', credentials:'same-origin'});
      }));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // Keep the browser's waiting lifecycle. Never replace a worker mid-draft.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    // First installation can make this already-open page usable offline, without reload.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== APP.origin) return;
  const canonical = STATIC_PATHS.get(url.pathname);
  if (!canonical) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(canonical, {ignoreSearch:true});
    // All normal requests use this worker's entire version, including navigations.
    // A missing/evicted cache can use the network, but never mutates this release.
    return cached || fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'PI_OFFLINE_STATUS' || !event.ports?.[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const entries = await Promise.all(URLS.map(url => cache.match(url, {ignoreSearch:true})));
      event.ports[0].postMessage({ready:entries.every(Boolean), version:BUILD});
    } catch (_) {
      event.ports[0].postMessage({ready:false, version:BUILD});
    }
  })());
});

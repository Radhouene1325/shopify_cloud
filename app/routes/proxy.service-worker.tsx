// app/utils/deploy-sw.server.ts
import { authenticate } from "~/shopify.server";

export async function deployServiceWorker(admin: any, themeId: string) {
  const swCode = `
const CACHE_NAME = 'platinumshop-v1';
const BLOCKED_HOSTS = ['monorail-edge.shopifysvc.com','shopifysvc.com','stripe.com','paypal.com'];
const BLOCKED_PATHS = ['/admin','/checkout','/cart','/account','/pay','/wallets'];

function isBlocked(url){
  if(BLOCKED_HOSTS.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))return true;
  if(BLOCKED_PATHS.some(p=>url.pathname.startsWith(p)))return true;
  return false;
}

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
  ).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const{request}=e;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(isBlocked(url))return;
  if(!['style','script','font','image'].includes(request.destination))return;
  e.respondWith(caches.match(request).then(cached=>{
    if(cached)return cached;
    return fetch(request).then(response=>{
      if(!response||response.status!==200||response.type==='opaque')return response;
      const clone=response.clone();
      caches.open(CACHE_NAME).then(c=>c.put(request,clone)).catch(console.error);
      return response;
    });
  }));
});
`;

  const mutation = `
    mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
      themeFilesUpsert(files: $files, themeId: $themeId) {
        upsertedThemeFiles { filename }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    themeId: `gid://shopify/OnlineStoreTheme/${themeId}`,
    files: [
      {
        filename: "assets/platinumshop-sw.js",
        body: swCode,
        // Use "text" for plain JS content
      }
    ]
  };

  const response = await admin.graphql(mutation, { variables });
  return response.json();
}
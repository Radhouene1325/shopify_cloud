// // app/utils/deploy-sw.server.ts
// import { authenticate } from "~/shopify.server";

// export async function deployServiceWorker(admin: any, themeId: string) {
//   const swCode = `
// const CACHE_NAME = 'platinumshop-v1';
// const BLOCKED_HOSTS = ['monorail-edge.shopifysvc.com','shopifysvc.com','stripe.com','paypal.com'];
// const BLOCKED_PATHS = ['/admin','/checkout','/cart','/account','/pay','/wallets'];

// function isBlocked(url){
//   if(BLOCKED_HOSTS.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))return true;
//   if(BLOCKED_PATHS.some(p=>url.pathname.startsWith(p)))return true;
//   return false;
// }

// self.addEventListener('install',()=>self.skipWaiting());
// self.addEventListener('activate',e=>{
//   e.waitUntil(caches.keys().then(keys=>
//     Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
//   ).then(()=>self.clients.claim()));
// });

// self.addEventListener('fetch',e=>{
//   const{request}=e;
//   if(request.method!=='GET')return;
//   const url=new URL(request.url);
//   if(isBlocked(url))return;
//   if(!['style','script','font','image'].includes(request.destination))return;
//   e.respondWith(caches.match(request).then(cached=>{
//     if(cached)return cached;
//     return fetch(request).then(response=>{
//       if(!response||response.status!==200||response.type==='opaque')return response;
//       const clone=response.clone();
//       caches.open(CACHE_NAME).then(c=>c.put(request,clone)).catch(console.error);
//       return response;
//     });
//   }));
// });
// `;

//   const mutation = `
//     mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
//       themeFilesUpsert(files: $files, themeId: $themeId) {
//         upsertedThemeFiles { filename }
//         userErrors { field message }
//       }
//     }
//   `;

//   const variables = {
//     themeId: `gid://shopify/OnlineStoreTheme/${themeId}`,
//     files: [
//       {
//         filename: "assets/platinumshop-sw.js",
//         body: swCode,
//         // Use "text" for plain JS content
//       }
//     ]
//   };

//   const response = await admin.graphql(mutation, { variables });
//   return response.json();
// }

// app/utils/sw-code.ts
export const SERVICE_WORKER_CODE = `
const CACHE_NAME = 'platinumshop-v1';

// Domains that must NEVER be intercepted
const BLOCKED_HOSTS = [
  'monorail-edge.shopifysvc.com',
  'shopifysvc.com',
  'stripe.com',
  'paypal.com',
  'google-analytics.com',
  'googletagmanager.com',
  'connect.facebook.net',
  'facebook.com'
];

// Paths that must always go to network
const BLOCKED_PATHS = [
  '/admin',
  '/checkout',
  '/cart',
  '/account',
  '/pay',
  '/wallets',
  '/api',
  '/services'
];

function isBlocked(url) {
  const hostname = url.hostname;
  if (BLOCKED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) {
    return true;
  }
  const pathname = url.pathname;
  if (BLOCKED_PATHS.some(p => pathname.startsWith(p))) {
    return true;
  }
  return false;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Only handle GET requests
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);
  
  // Never intercept Shopify admin, checkout, payments, or analytics
  if (isBlocked(url)) return;
  
  // Only cache static assets
  const allowedDestinations = ['style', 'script', 'font', 'image'];
  if (!allowedDestinations.includes(request.destination)) return;
  
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      
      return fetch(request).then(response => {
        // Don't cache errors, redirects, or opaque responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        
        // Cache valid responses in the background
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(request, clone))
          .catch(err => console.error('SW Cache Error:', err));
          
        return response;
      }).catch(err => {
        console.error('SW Fetch Error:', err);
        throw err;
      });
    })
  );
});
`;

// app/routes/api.deploy-sw.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";
export async function action({ request ,context}: ActionFunctionArgs) {
  let { admin, session } = await shopify(context).authenticate.admin(request);
  // Get the active theme ID first
  const themesQuery = `
    query getThemes {
      themes(first: 10) {
        nodes {
          id
          name
          role
        }
      }
    }
  `;
  
  const themesResponse = await admin.graphql(themesQuery);
  const themesData = await themesResponse.json();
  
  // Find the main (active) theme
  const activeTheme = themesData.data.themes.nodes.find(
    (t: any) => t.role === "MAIN"
  );
  
  if (!activeTheme) {
    return Response.json({ error: "No active theme found" }, { status: 400 });
  }
  
  const themeId = activeTheme.id; // e.g., "gid://shopify/OnlineStoreTheme/123456789"
  
  // Upsert the Service Worker file into theme assets
 const upsertMutation = `
    mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
      themeFilesUpsert(files: $files, themeId: $themeId) {
        upsertedThemeFiles {
          filename
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const variables = {
    themeId: themeId,
    files: [
      {
        filename: "assets/platinumshop-sw.js",
        body: {
          contentType: "TEXT",
          // encoding: "UTF8",
          // The actual JS code
          content: SERVICE_WORKER_CODE
        }
      }
    ]
  };
  
  const upsertResponse = await admin.graphql(upsertMutation, { variables });
  const upsertData = await upsertResponse.json();
  
  if (upsertData.data?.themeFilesUpsert?.userErrors?.length > 0) {
    return Response.json(
      { error: upsertData.data.themeFilesUpsert.userErrors },
      { status: 400 }
    );
  }
  
  return Response.json({
    success: true,
    themeId: themeId,
    file: "assets/platinumshop-sw.js",
    upserted: upsertData.data?.themeFilesUpsert?.upsertedThemeFiles
  });
}


// app/routes/app.sw-manager.tsx
import { useSubmit } from "@remix-run/react";
import { Page, Layout, Card, Button, Banner } from "@shopify/polaris";
import { useState } from "react";

export default function ServiceWorkerManager() {
  const submit = useSubmit();
  const [status, setStatus] = useState<string | null>(null);

  const handleDeploy = () => {
    setStatus("Deploying...");
    submit(null, { method: "POST" });
  };

  return (
    <Page title="Service Worker Manager">
      <Layout>
        <Layout.Section>
          <Card>
            <Banner status="info">
              Deploy the Service Worker to your theme assets to enable 
              image caching across your entire store.
            </Banner>
            <div style={{ marginTop: "16px" }}>
              <Button primary onClick={handleDeploy}>
                Deploy Service Worker to Theme
              </Button>
            </div>
            {status && <p style={{ marginTop: "12px" }}>{status}</p>}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
// import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

// export async function action({ request, context }: ActionFunctionArgs) {
//   const formData = await request.formData();
//   const intent = formData.get('intent');
// const DOMIN = (context as any).cloudflare.env.SHOPIFY_APP_URL
//   // ─── WARM CACHE: Precarica i pannelli più usati ───
//   if (intent === 'warm') {
//     const menus = (formData.getAll('menu') as string[]) || ['main-menu'];
//     const cache = (context.cloudflare.caches as any).default;

//     const warmJobs = menus.flatMap((menu) =>
//       [0, 1, 2, 3, 4].map(async (parent) => {
//         const url = `${new URL(request.url).origin}/proxy/mega-menu?menu=${menu}&parent=${parent}`;
//         // Fetch forza la cache
//         return fetch(url, {
//           headers: { 'X-Warm-Cache': '1' },
//           cf: { cacheTtl: 3600 },
//         });
//       })
//     );

//     (context as any).waitUntil(Promise.all(warmJobs));
//     return json({ warmed: warmJobs.length });
//   }

//   // ─── TRACK HOVER: Analytics non bloccanti ───
//   if (intent === 'track') {
//     const categoryId = formData.get('categoryId');
//     const menu = formData.get('menu');

//     (context as any).waitUntil(
//       // Sostituisci con il tuo endpoint analytics
//       fetch(`https://analytics.${DOMIN}.com/track`, {
//         method: 'POST',
//         body: JSON.stringify({ event: 'mega_menu_hover', categoryId, menu, t: Date.now() }),
//         headers: { 'Content-Type': 'application/json' },
//       }).catch(() => {})
//     );

//     return json({ ok: true });
//   }

//   return json({ ok: false }, { status: 400 });
// }






// import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

// export async function action({ request, context }: ActionFunctionArgs) {
//   const contentType = request.headers.get('content-type') || '';

//   let intent: string | null = null;
//   let data: any = {};

//   // ✅ SAFE parsing
//   if (contentType.includes('application/json')) {
//     data = await request.json();
//     intent = data.intent;
//   } else if (
//     contentType.includes('multipart/form-data') ||
//     contentType.includes('application/x-www-form-urlencoded')
//   ) {
//     const formData = await request.formData();
//     intent = formData.get('intent');
//     data = Object.fromEntries(formData);
//   } else {
//     return json({ error: 'Unsupported Content-Type' }, { status: 415 });
//   }

//   const DOMAIN = ((context as any).cloudflare.env.SHOPIFY_APP_URL || '')
//     .replace(/^https?:\/\//, '')
//     .replace(/\/$/, '');

//   // ─── WARM CACHE ───
//   if (intent === 'warm') {
//     const menus = data.menu
//       ? Array.isArray(data.menu)
//         ? data.menu
//         : [data.menu]
//       : ['main-menu'];

//     const jobs = menus.flatMap((menu: string) =>
//       [0, 1, 2, 3, 4].map((parent) => {
//         const url = `${new URL(request.url).origin}/proxy-1/mega-menu?menu=${menu}&parent=${parent}`;

//         return fetch(url, {
//           headers: { 'X-Warm-Cache': '1' },
//           cf: { cacheTtl: 3600, cacheEverything: true },
//         }).catch(() => null);
//       })
//     );

//     context.waitUntil(Promise.all(jobs));

//     return json({ ok: true, warmed: jobs.length });
//   }

//   // ─── TRACK ───
//   if (intent === 'track') {
//     (context as any).waitUntil(
//       fetch(`https://analytics.${DOMAIN}/track`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           event: 'mega_menu_hover',
//           categoryId: data.categoryId,
//           menu: data.menu,
//           t: Date.now(),
//         }),
//       }).catch(() => {})
//     );

//     return json({ ok: true });
//   }

//   return json({ error: 'Invalid intent' }, { status: 400 });
// }




import { json, type ActionFunctionArgs } from '@remix-run/node';

type CloudflareContext = {
  waitUntil: (promise: Promise<any>) => void;
  cloudflare: {
    env: {
      SHOPIFY_APP_URL: string;
    };
  };
};

export async function action({ request, context }: ActionFunctionArgs) {
  const ctx = context as unknown as CloudflareContext;

  const contentType = request.headers.get('content-type') || '';

  let data: any = {};
  let intent: string | null = null;

  if (contentType.includes('application/json')) {
    data = await request.json();
    intent = data.intent;
  } else {
    const formData = await request.formData();
    intent = formData.get('intent') as string | null;
    data = Object.fromEntries(formData);
  }

  if (intent === 'warm') {
    const menus = data.menu
      ? Array.isArray(data.menu)
        ? data.menu
        : [data.menu]
      : ['main-menu'];

    const jobs = menus.flatMap((menu: string) =>
      [0, 1, 2, 3, 4].map((parent) => {
        const url = `${new URL(request.url).origin}/proxy-1/mega-menu?menu=${menu}&parent=${parent}`;

        return fetch(url, {
          headers: { 'X-Warm-Cache': '1' },
          cf: { cacheTtl: 3600, cacheEverything: true },
        }).catch(() => null);
      })
    );

    // ✅ Correct + typed
    ctx.waitUntil(Promise.all(jobs));

    return json({ ok: true, warmed: jobs.length });
  }

  return json({ ok: false }, { status: 400 });
}
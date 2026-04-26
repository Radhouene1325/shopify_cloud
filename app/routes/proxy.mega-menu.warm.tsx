import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
const DOMIN =context.cloudflare.env.SHOPIFY_APP_URL
  // ─── WARM CACHE: Precarica i pannelli più usati ───
  if (intent === 'warm') {
    const menus = (formData.getAll('menu') as string[]) || ['main-menu'];
    const cache = context.cloudflare.caches.default;

    const warmJobs = menus.flatMap((menu) =>
      [0, 1, 2, 3, 4].map(async (parent) => {
        const url = `${new URL(request.url).origin}/proxy/mega-menu?menu=${menu}&parent=${parent}`;
        // Fetch forza la cache
        return fetch(url, {
          headers: { 'X-Warm-Cache': '1' },
          cf: { cacheTtl: 3600 },
        });
      })
    );

    context.waitUntil(Promise.all(warmJobs));
    return json({ warmed: warmJobs.length });
  }

  // ─── TRACK HOVER: Analytics non bloccanti ───
  if (intent === 'track') {
    const categoryId = formData.get('categoryId');
    const menu = formData.get('menu');

    context.waitUntil(
      // Sostituisci con il tuo endpoint analytics
      fetch(`https://analytics.${DOMIN}.com/track`, {
        method: 'POST',
        body: JSON.stringify({ event: 'mega_menu_hover', categoryId, menu, t: Date.now() }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    );

    return json({ ok: true });
  }

  return json({ ok: false }, { status: 400 });
}
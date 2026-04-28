import { json } from '@remix-run/node';
import { shopify } from '../shopify.server';

export async function loader({ request, context }) {
  const cf = context.cloudflare;
  const env = cf.env;
  const waitUntil = cf.ctx?.waitUntil;

  const handle = new URL(request.url).searchParams.get('handle');
  if (!handle) return json({ error: 'missing' }, { status: 400 });

  const key = `p:${handle}`;

  // =========================
  // 1. EDGE KV ONLY (FAST PATH)
  // =========================
  const cached = await env.KV_PRODUCT.get(key, { type: 'json' });

  if (cached) {
    // refresh in background (NOT blocking)
    waitUntil?.(revalidate(context, handle, env));

    return json(cached, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Cache': 'HIT',
      },
    });
  }

  // =========================
  // 2. ONLY ON MISS → Shopify
  // =========================
  const { admin } =
    await shopify(context).authenticate.public.appProxy(request);

  const product = await fetchProduct(admin, handle);

  waitUntil?.(
    env.KV_PRODUCT.put(key, JSON.stringify(product), {
      expirationTtl: 86400,
    })
  );

  return json(product, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'X-Cache': 'MISS',
    },
  });
}

// =========================
// MINIMAL GRAPHQL (IMPORTANT)
// =========================
async function fetchProduct(storefront, handle) {
  const res = await storefront.graphql(
    `
    query ($handle: String!) {
      productByHandle(handle: $handle) {
        title
        handle
        featuredImage { url }
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
    `,
    { variables: { handle } }
  );

  const data = await res.json();
  const p = data?.data?.productByHandle;

  return {
    title: p.title,
    handle: p.handle,
    image: p.featuredImage?.url,
    price: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
  };
}

// =========================
// BACKGROUND REVALIDATION
// =========================
async function revalidate(context, handle, env) {
  try {
    const { admin } =
      await shopify(context).authenticate.public.appProxy(
        new Request('https://dummy')
      );

    const product = await fetchProduct(admin, handle);

    await env.KV_PRODUCT.put(`p:${handle}`, JSON.stringify(product), {
      expirationTtl: 86400,
    });
  } catch {}
}
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { shopify } from '../shopify.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return json({ error: 'Missing handle' }, { status: 400 });
  }

  const env = context.cloudflare?.env as any;
  const cacheKey = `p:${handle}`;

  // =========================
  // 1. KV HIT (10–30ms)
  // =========================
  const cached = await env.KV_PRODUCT.get(cacheKey, { type: 'json' });

  if (cached) {
    context.waitUntil(refresh(context, handle, env));

    return json(cached, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
      },
    });
  }

  // =========================
  // 2. SHOPIFY FETCH
  // =========================
  const { admin } = await shopify(context).authenticate.admin(request);

  const product = await fetchProduct(admin, handle);

  // =========================
  // 3. WRITE KV (ASYNC)
  // =========================
  context.waitUntil(
    env.KV_PRODUCT.put(cacheKey, JSON.stringify(product), {
      expirationTtl: 3600,
    })
  );

  return json(product, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    },
  });
}

// =============================
// GRAPHQL
// =============================
async function fetchProduct(storefront: any, handle: string) {
  const res = await storefront.graphql(`
    query ($handle: String!) {
      productByHandle(handle: $handle) {
        title
        handle
      }
    }
  `, { variables: { handle } });

  const data = await res.json();

  return data.data.productByHandle;
}

// =============================
// BACKGROUND REFRESH
// =============================
async function refresh(context: any, handle: string, env: any) {
  try {
    const { admin } = await shopify(context).authenticate.admin(
      new Request('https://dummy')
    );

    const product = await fetchProduct(admin, handle);

    await env.KV_PRODUCT.put(`p:${handle}`, JSON.stringify(product), {
      expirationTtl: 3600,
    });
  } catch {}
}
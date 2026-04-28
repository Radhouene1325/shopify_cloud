import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { shopify } from '../shopify.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return json({ error: 'Missing handle' }, { status: 400 });
  }

  const env = context.cloudflare?.env as any;

  if (!env?.KV_PRODUCT) {
    throw new Error('KV_PRODUCT binding is missing');
  }

  const cacheKey = `product:${handle}`;

  // =========================
  // 1. KV CACHE (FAST)
  // =========================
  const cached = await env.KV_PRODUCT.get(cacheKey, { type: 'json' });

  if (cached) {
    // 🔥 background refresh
    context.waitUntil(refreshProduct(context, handle, env));

    return json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
      },
    });
  }

  // =========================
  // 2. FETCH FROM SHOPIFY
  // =========================
  const { admin } = await shopify(context).authenticate.admin(request);

  const product = await fetchShopifyProduct(admin, handle);

  // =========================
  // 3. STORE IN KV (ASYNC)
  // =========================
  context.waitUntil(
    env.KV_PRODUCT.put(cacheKey, JSON.stringify(product), {
      expirationTtl: 3600,
    })
  );

  return json(product, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    },
  });
}

// =============================
// SHOPIFY GRAPHQL
// =============================
async function fetchShopifyProduct(storefront: any, handle: string) {
  const response = await storefront.graphql(
    `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle

        featuredImage {
          url
        }

        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }

        variants(first: 1) {
          nodes {
            availableForSale
          }
        }
      }
    }
    `,
    { variables: { handle } }
  );

  const data = await response.json();
  const p = data?.data?.productByHandle;

  if (!p) {
    throw new Response('Not Found', { status: 404 });
  }

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    image: p.featuredImage?.url ?? null,
    available: p.variants?.nodes?.[0]?.availableForSale ?? false,
    price: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
  };
}

// =============================
// BACKGROUND REFRESH
// =============================
async function refreshProduct(context: any, handle: string, env: any) {
  try {
    if (!env?.KV_PRODUCT) return;

    const { admin } = await shopify(context).authenticate.admin(
      new Request('https://dummy')
    );

    const product = await fetchShopifyProduct(admin, handle);

    await env.KV_PRODUCT.put(`product:${handle}`, JSON.stringify(product), {
      expirationTtl: 3600,
    });
  } catch {
    // silent fail
  }
}
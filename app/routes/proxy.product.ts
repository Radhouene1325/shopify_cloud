import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { shopify } from '../shopify.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return Response.json({ error: 'Missing handle' }, { status: 400 });
  }

  const env = context.cloudflare.env as any;
  const cacheKey = `product:${handle}`;

  // =========================
  // 1. KV CACHE CHECK
  // =========================
  const cached = await env.PRODUCT_KV?.get(cacheKey, {
    type: 'json',
  });

  if (cached) {
    // 🔥 background refresh (stale-while-revalidate)
    context.waitUntil(
      refreshProduct(context, handle, env)
    );

    return Response.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
      },
    });
  }

  // =========================
  // 2. SHOPIFY FETCH (MISS)
  // =========================
  const { admin } = await shopify(context).authenticate.public.appProxy(request)

  const product = await fetchShopifyProduct(admin, handle);

  // =========================
  // 3. WRITE TO KV (ASYNC)
  // =========================
  context.waitUntil(
    env.PRODUCT_KV.put(cacheKey, JSON.stringify(product), {
      expirationTtl: 3600,
    })
  );

  return Response.json(product, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    },
  });
}



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
  {
    variables: { handle },
  }
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



async function refreshProduct(context: any, handle: string, env: any) {
  try {
    const { storefront } = await shopify(context).authenticate.public.appProxy(
      new Request('https://dummy')
    );

    const product = await fetchShopifyProduct(storefront, handle);

    await context.cloudflare.env.PRODUCT_KV.put(`product:${handle}`, JSON.stringify(product), {
      expirationTtl: 3600,
    });
  } catch (e) {
    // silent fail (important for edge performance)
  }
}
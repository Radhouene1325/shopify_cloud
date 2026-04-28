import { shopify } from '../shopify.server';

export async function loader({ request, context }: any) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return new Response('Missing handle', { status: 400 });
  }

  const env = context.cloudflare?.env;
  const cacheKey = `html:${handle}`;

  // =========================
  // 1. KV CACHE
  // =========================
  const cached = await env?.KV_PRODUCT?.get(cacheKey);

  if (cached) {
    context.waitUntil(refresh(context, handle, env,request));

    return new Response(cached, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  // =========================
  // 2. SHOPIFY (APP PROXY SAFE)
  // =========================
  const { admin } =
    await shopify(context).authenticate.admin(request);

  const product = await fetchProduct(admin, handle);

  const html = renderHTML(product);

  // =========================
  // 3. STORE KV (ASYNC)
  // =========================
  context.waitUntil(
    env.KV_PRODUCT.put(cacheKey, html, {
      expirationTtl: 3600,
    })
  );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600',
      'X-Cache': 'MISS',
    },
  });
}

// =========================
// FETCH SHOPIFY
// =========================
async function fetchProduct(storefront: any, handle: string) {
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

  if (!p) throw new Response('Not Found', { status: 404 });

  return {
    title: p.title,
    image: p.featuredImage?.url,
    price: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
  };
}

// =========================
// HTML RENDER
// =========================
function renderHTML(p: any) {
  return `
    <div id="app">
      <div class="product-page">
        <h1>${p.title}</h1>
        <img src="${p.image}" loading="eager" />
        <p>${p.price}</p>
      </div>
    </div>
  `;
}

// =========================
// BACKGROUND REFRESH
// =========================
async function refresh(context: any, handle: string, env: any, request) {
  try {
    const { admin } =
      await shopify(context).authenticate.admin(request);

    const product = await fetchProduct(admin, handle);
    const html = renderHTML(product);

    await env.KV_PRODUCT.put(`html:${handle}`, html, {
      expirationTtl: 3600,
    });
  } catch {}
}
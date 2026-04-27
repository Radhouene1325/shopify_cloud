import {  type LoaderFunctionArgs } from '@remix-run/node';
import { shopify } from '../shopify.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return Response.json({ error: 'Missing handle' }, { status: 400 });
  }

  // ✅ Use STOREFRONT (not admin)
    const { session, admin } = await shopify(context).authenticate.admin(request);

  const product = await fetchShopifyProduct(admin, handle);

  return Response.json(product, {
    headers: {
      // 🔥 EDGE CACHE (this now works correctly)
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

async function fetchShopifyProduct(storefront: any, handle: string) {
  const response = await storefront.graphql(
    `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
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
      }
    }
  `,
    {
      variables: { handle },
    }
  );

  const data = await response.json();
  const p = data.data.productByHandle;

  if (!p) {
    throw new Response('Not Found', { status: 404 });
  }

  return {
    title: p.title,
    handle: p.handle,
    image: p.featuredImage?.url,
    price: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
  };
}
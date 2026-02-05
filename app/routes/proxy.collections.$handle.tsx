// app/routes/proxy.collections.$handle.tsx
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  console.log('hello woeld')
  const { session } = await shopify(context).authenticate.public.appProxy(request);
  console.log('params is her',params)
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const collectionHandle = params.handle; // Dynamic parameter
  
  if (!shop) {
    return json({ error: "Shop parameter missing" }, { status: 400 });
  }

  const sessionData = await prisma(context.cloudflare.env.DATABASE_URL).session.findUnique({
    where: { shop }
  });

  if (!sessionData || !sessionData.accessToken) {
    return json({ error: "Shop not authenticated" }, { status: 401 });
  }

  const query = `
    query {
      collectionByHandle(handle: "${collectionHandle}") {
        id
        title
        handle
        description
        products(first: 20) {
          edges {
            node {
              id
              title
              handle
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': sessionData.accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      return json({ error: 'GraphQL query failed' }, { status: 500 });
    }

    return json(data.data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=120",
      },
    });
    
  } catch (error) {
    return json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}

import { shopify } from "../shopify.server";
import {
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
const SHOP_ORIGIN = "https://0g5p1w-50.myshopify.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": SHOP_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
export async function loader({ request,context }:LoaderFunctionArgs) {
  // if (request.method === "OPTIONS") {
  //   return new Response(null, { headers: corsHeaders });
  // }
  // const { admin } = await shopify(context).authenticate.public.appProxy(request);
  const {admin}=await shopify(context).authenticate.admin(request);
console.log('ddddddddddddddddddd',admin)
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const query = `
    query {
      discountNodes(first: 50) {
        edges {
          node {
            id
            discount {
              ... on DiscountCodeBasic {
                title
                status
                codes(first: 10) {
                  nodes {
                    code
                  }
                }
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                    ... on DiscountAmount {
                      amount {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
                startsAt
                endsAt
              }
              ... on DiscountAutomaticBasic {
                title
                status
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                  }
                }
                startsAt
                endsAt
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    // console.log(data)
    // console.log('hello')
    
    // Filtra solo discount ATTIVI
    const activeDiscounts = data.data.discountNodes.edges
      .filter(({ node }:any) => node.discount.status === 'ACTIVE')
      .map(({ node }:any) => {
        const discount = node.discount;
        
        return {
          title: discount.title,
          code: discount.codes?.nodes[0]?.code || null,
          percentage: discount.customerGets?.value?.percentage || null,
          amount: discount.customerGets?.value?.amount || null,
          type: discount.codes ? 'code' : 'automatic',
          startsAt: discount.startsAt,
          endsAt: discount.endsAt
        };
      });

    return new Response(JSON.stringify(activeDiscounts), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
    
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch discounts' }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}


  export const Dsicounts=()=>{

    const data=useLoaderData()

    return(
      <>
      <input />
      <p>hello data im here</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      </>
    )
  }
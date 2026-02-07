import { type LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
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
const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const query = 
    `#graphql
    query GetVariants($cursor: String) {
      productVariants(
        first: 250
        after: $cursor
        query: "inventory_quantity:0"
      ) {
        edges {
          node {
            id
            title
            inventoryPolicy
            inventoryQuantity
            sku
            product {
              id
              title
              
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    
  `;

  try {
    const response = await admin.graphql(query, { variables: { cursor } });
    const data = await response.json();
    // console.log(data)
    // console.log('hello')
    
    // Filtra solo discount ATTIVI
    const activeDiscounts ={
      
        variants: data.data.productVariants.edges.map((e: any) => e.node),
        pageInfo: data.data.productVariants.pageInfo
      
    }

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


export default function Discounts() {
  const initial = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [rows, setRows] = useState(initial.variants);
  const [pageInfo, setPageInfo] = useState(initial.pageInfo);

  // cursor history
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  interface SelectedVariant {
    id: string;
    product: { id: string };
  }

  const [selected, setSelected] = useState<SelectedVariant[]>([]);

  // Handle pagination result
  useEffect(() => {
    if (fetcher.data) {
      setRows(fetcher.data.variants);
      setPageInfo(fetcher.data.pageInfo);
    }
  }, [fetcher.data]);

  // Auto-select CONTINUE variants on each page
  useEffect(() => {
    const autoSelected: SelectedVariant[] = rows
      .filter((v: any) => v.inventoryPolicy === "CONTINUE")
      .map((v: any) => ({
        id: v.id,
        product: { id: v.product.id }
      }));

    setSelected(autoSelected);
  }, [rows]);
console.log('selected',selected)
  const prevCursor =
    cursorStack.length > 1
      ? cursorStack[cursorStack.length - 2]
      : undefined;

  return (
    <div style={{ padding: 24 }}>
      <h1>Out of stock variants</h1>

      <table width="100%" border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Select</th>
            <th>Product Title</th>
            <th>Product ID</th>
            <th>Variant ID</th>
            <th>Variant</th>
            <th>Inventory</th>
            <th>Policy</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((v: any) => (
            <tr key={v.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.some(s => s.id === v.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(prev => [
                        ...prev,
                        { id: v.id, product: { id: v.product.id } }
                      ]);
                    } else {
                      setSelected(prev =>
                        prev.filter(s => s.id !== v.id)
                      );
                    }
                  }}
                />
              </td>
              <td>{v.product.title}</td>
              <td>{v.product.id}</td>
              <td>{v.id}</td>
              <td>{v.title}</td>
              <td>{v.inventoryQuantity}</td>
              <td>{v.inventoryPolicy}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Next page */}
      {pageInfo.hasNextPage && (
        <button
          disabled={fetcher.state === "loading"}
          onClick={() => {
            setCursorStack(prev => [...prev, pageInfo.endCursor]);
            fetcher.load(`?cursor=${pageInfo.endCursor}`);
          }}
        >
          {fetcher.state === "loading" ? "Loading..." : "Next page →"}
        </button>
      )}

      {/* Previous page */}
      {prevCursor && (
        <button
          disabled={fetcher.state === "loading"}
          onClick={() => {
            setCursorStack(prev => prev.slice(0, -1));
            fetcher.load(`?cursor=${prevCursor}`);
          }}
        >
          ← Previous page
        </button>
      )}
    </div>
  );
}












  // app/routes/variants.tsx


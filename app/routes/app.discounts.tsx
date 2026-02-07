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
        first: 50
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


  export default function Dsicounts(){

    const initial = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
  
    const [rows, setRows] = useState(initial.variants);
    const [pageInfo, setPageInfo] = useState(initial.pageInfo);

    const [cursorStack, setCursorStack] = useState<string[]>([]);

  
    useEffect(() => {
      if (fetcher.data) {
        setRows(fetcher.data.variants);
        setPageInfo(fetcher.data.pageInfo);
        setCursorStack(prev => [...prev, pageInfo.endCursor]);

      }
    }, [fetcher.data]);
    const prevCursor = cursorStack[cursorStack.length - 2];
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    useEffect(() => {
      const autoSelected = new Set(
        rows
          .filter((v: any) => v.inventoryPolicy === "CONTINUE")
          .map((v: any) => v.id)
      );
    
      setSelectedIds(autoSelected);
    }, [rows]);
    
    return (
      <div style={{ padding: 24 }}>
        <h1>Out of stock variants</h1>
  
        <table width="100%" border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>Inventory</th>
              <th>Policy</th>
              <th>
  <input
    type="checkbox"
    checked={
      rows.length > 0 &&
      rows
        .filter(v => v.inventoryPolicy === "CONTINUE")
        .every(v => selectedIds.has(v.id))
    }
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedIds(
          new Set(
            rows
              .filter(v => v.inventoryPolicy === "CONTINUE")
              .map(v => v.id)
          )
        );
      } else {
        setSelectedIds(new Set());
      }
    }}
  />
</th>

            </tr>
          </thead>
  
          <tbody>
            {rows.map((v: any) => (
              <tr key={v.id}>
                 <td>
          <input
            type="checkbox"
            checked={selectedIds.has(v.id)}
            onChange={(e) => {
              setSelectedIds(prev => {
                const next = new Set(prev);
                e.target.checked ? next.add(v.id) : next.delete(v.id);
                return next;
              });
            }}
          />
        </td>
                <td>{v.product.title}</td>
                <td>{v.product.id}</td>
                <td>{v.sku}</td>
                <td>{v.title}</td>
                <td>{v.inventoryQuantity}</td>
                <td>{v.inventoryPolicy}</td>
              </tr>
            ))}
          </tbody>
        </table>
  
        <div style={{ marginTop: 16 }}>
          {pageInfo.hasNextPage && (
         <button
         disabled={fetcher.state === "loading"}
         onClick={() =>
           fetcher.load(`?cursor=${pageInfo.endCursor}`)
         }
       >
         {fetcher.state === "loading" ? "Loading..." : "Next page →"}
       </button>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          {pageInfo.hasNextPage && (
         <button
         disabled={fetcher.state === "loading"}
         onClick={() =>
          fetcher.load(`?cursor=${prevCursor}`)

         }
       >
         {fetcher.state === "loading" ? "Loading..." : "old page →"}
       </button>
          )}
        </div>
      </div>
    );
  }












  // app/routes/variants.tsx


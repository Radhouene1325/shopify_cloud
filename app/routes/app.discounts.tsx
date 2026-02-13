import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

import { useLoaderData, useFetcher, useSubmit, useActionData, useNavigate, useNavigation, useLocation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Page, Layout, Card, Button, Banner, BlockStack } from "@shopify/polaris";


export async function loader({ request,context }:LoaderFunctionArgs) {
  // if (request.method === "OPTIONS") {
  //   return new Response(null, { headers: corsHeaders });
  // }
  // const { admin } = await shopify(context).authenticate.public.appProxy(request);
  console.log('is work loader secces ')
  // const { session } = await shopify(context).authenticate.public.appProxy(request);
  // console.log("session is her ",session)
  const {admin}=await shopify(context).authenticate.admin(request);
console.log('ddddddddddddddddddd',admin)
const url = new URL(request.url);
console.log('url cursor is her',url)
  const cursor = url.searchParams.get("cursor");
  console.log('cursor',cursor)
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
        query: "inventory_quantity:10"
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
  const submit =useSubmit()
  const actionData=useActionData()
  const navigation=useNavigation()
  const isSubmitting=navigation.state==="submitting"
console.log('action data is her',actionData)
console.log('fetcher data is her',fetcher)
console.log('fetcher data is her',fetcher.state)
  const [rows, setRows] = useState(initial?.variants);
  const [pageInfo, setPageInfo] = useState(initial?.pageInfo);

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

const handleSubmitFormData = () => {
  // if(selected.length===0) return 
  console.log('Submitting these IDs:', selected.map(s => s.id)); // Check if this is empty
  console.log('action oky button')
  const formData = new FormData();
  formData.append("selected", JSON.stringify(selected));
  console.log('form data is working oky ',formData)
  submit(formData, { 
    method: "post",
    encType: "application/x-www-form-urlencoded" 
  });
};
console.log('hello cursor',pageInfo)

const location=useLocation()
  const prevCursor =
    cursorStack.length > 1
      ? cursorStack[cursorStack.length - 2]
      : undefined;




      const handleNextPage = () => {
        setCursorStack(prev => [...prev, pageInfo.endCursor]);
        
        // Use submit for GET request with cursor parameter
        submit(
          { cursor: pageInfo.endCursor },
          { 
            method: "get",
            action: location.pathname,
            navigate: false,  // This prevents URL change but still calls the loader
            fetcherKey: "pagination" // Optional: gives you more control
          }
        );
      };
    
      // Handle previous page with submit
        
  return (
    <>
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

      {/* updated thedata */}
      <Button
                variant="primary"
                onClick={handleSubmitFormData}
                 loading={isSubmitting}
                size="large"
              >
                Create updated policy
              </Button>
    </div>


</>

  );
}






export async function action({request,context}:ActionFunctionArgs) {
console.log('action is started oky ')
  let {admin}=await shopify(context).authenticate.admin(request)
const formData=await request.formData()
const updatedpolicyvariants=JSON.parse(formData.get('selected')as string)

console.log('updatedpolicyvariants',updatedpolicyvariants)
//   const continueVariants = variants
// .filter(({ node }: any) => node.inventoryPolicy === "CONTINUE")
// .map(({ node }:any) => ({
//   id: node.id,
//   inventoryPolicy: "CONTINUE"
// }));
// console.log('varients coninuQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',continueVariants)

const variantsByProduct: Record<string, any[]> = {};

for (const v of updatedpolicyvariants) {
  if (!variantsByProduct[v.product.id]) {
    variantsByProduct[v.product.id] = [];
  }

  variantsByProduct[v.product.id].push({
    id: v.id,
    inventoryPolicy: "DENY"
  });
}


const results = [];

 
  for (const productId of Object.keys(variantsByProduct)) {
       console.log('node is hrer',productId)
      const mutationResponse = await admin?.graphql(
        `#graphql
        mutation UpdateContinueToDeny($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(
           
            productId: $productId
            variants: $variants
            
          ) {
            productVariants {
              id
              inventoryPolicy
            }
            userErrors {
              field
              message
            }
            
          }
        }
        `,
     {
      variables: {
        productId,
        variants: variantsByProduct[productId]
      }
    }
      );
      results.push(await mutationResponse?.json());
    }

    console.log(results)

    return Response.json({
      res:results
    })
    

}





  // app/routes/variants.tsx


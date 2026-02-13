// app/routes/proxy.tsx
import {type LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "../shopify.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // const { session } = await shopify(context).authenticate.public.appProxy(request);
  // console.log(JSON.stringify(session,null,2))
  return Response.json({ 
    message: "App Proxy root",
    endpoints: [
      "/apps/proxy/testeddiscounts",
      "/apps/proxy/istedted",
      "/apps/proxy/collections"
    ]
  }, {
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}

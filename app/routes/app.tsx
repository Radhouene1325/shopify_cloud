import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import React from "react";
import { shopify } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await shopify(context).authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
const Menu = React.memo(() => (
 <NavMenu>
        <Link to="/app" rel="home" prefetch="intent">Home</Link>
        <Link to="/app/discounts" prefetch="intent">Additional page</Link>
        <Link to="/app/descreptionupdated" prefetch="intent">descreption updated page</Link>
        <Link to="/app/translated" prefetch="intent">translated descreption</Link>
        <Link to="/app/images_optimise" prefetch="intent">images optimise</Link>
        <Link to="/app/updated_qyality_images" prefetch="intent">updated qyality images</Link>
        <Link to="/app/images_defrence" prefetch="intent">images defrence</Link>
        <Link to="/app/kimi_optimise_images" prefetch="intent">kimi optimise images</Link>
        <Link to="/app/relatedproducts" prefetch="intent">related products</Link>
        <Link to="/app/service-worker" prefetch="intent">Service Worker Manager</Link>
        <Link to="/app/authentication" prefetch="intent">Tiktok authentication</Link>
      </NavMenu>
));
export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
     
       <Menu/>
       
     
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};




import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { Badge, Banner, BlockStack, Box, Button, Card, Checkbox, DataTable, Divider, EmptyState, InlineStack, Page, Pagination, Spinner, Tag, Text, Thumbnail, Tooltip, useBreakpoints } from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
// sk-c8552ae161ed4db684bb1268bf4ba758
import * as cheerio from "cheerio";
import { productsupdated } from "./functions/query/updateprooductquery";
import {franc} from 'franc'
import { detect, detectAll } from 'tinyld';

// app/utils/translate.server.js
async function translateHtmlDeepL(html, DEEPL_API_KEY) {
  const authKey = DEEPL_API_KEY;

  // Free tier uses api-free.deepl.com, paid uses api.deepl.com
  const baseUrl = authKey?.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

const params = new URLSearchParams();

const lang1=detect(html.title)
console.log('lang is her1 ',lang1)
const lang2=detect(html.descreption)
console.log('lang is her2 ',lang2)

if (lang2==='it')return
console.log('is oky verivied ok')
// params.append('text', html.title);
params.append('text', html.descreption);

params.append('target_lang', 'IT');
params.append('source_lang', 'EN');
params.append('tag_handling', 'html');
params.append('ignore_tags', 'code,img');

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${authKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL Error: ${error}`);
  }

  const data = await response.json();
  console.log('data is her ', data.translations)
  return {
    id: html.id,
    translatedText: data?.translations[0]?.text,
    // translatedTitle: data?.translations[1]?.text,


  };
}


export async function action({ context, request }: ActionFunctionArgs) {
  let { admin } = await shopify(context).authenticate.admin(request)
  let { session } = await shopify(context).authenticate.admin(request)

  let formData = await request.formData()
  const updatedDescreptionAI = JSON.parse(formData.get('descreptionAI') as string);
  if (!Array.isArray(updatedDescreptionAI)) {
    console.error("Invalid or missing 'descreptionAI' data");
    return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
  }
  let apikey = context.cloudflare.env.DEEPL_API_KEY
  let updateProducts = []
  // console.log('updatedDescreptionAI is her ', updatedDescreptionAI)
  for (const OLD_DESC of updatedDescreptionAI) {
    const data = {
      id: OLD_DESC.id,
      descreption: OLD_DESC.descreption,
      title: OLD_DESC.title,

    }
    const translatedText = await translateHtmlDeepL(data, apikey);
    // console.log("Translated Text:", translatedText);


    updateProducts.push({
      id: translatedText?.id,
      descriptionHtml: translatedText?.translatedText,
      // tags: mergedTags,
      // category: SEO.category?.id,
      // handle: OLD_DESC.handle || OLD_DESC.handel,
      // productType: SEO.productType,
      // seo: { description: SEO.seoDescription, title: SEO.seoTitle },
      // metafields: [
      // //  { namespace: "custom", key: "descriptionsai", type: "json", value: JSON.stringify(DESC_AI.shortDescription) },
      // //   { namespace: "custom", key: "seo_title", type: "json", value: JSON.stringify(SEO.seoTitle) },
      // //   { namespace: "custom", key: "seo_descreption", type: "json", value: JSON.stringify(SEO.seoDescription) },
      //   // { namespace: "seo", key: "schema_org", type: "json", value: JSON.stringify(productSchema(SEO,collections,OLD_DESC,offers,aggregateRating__,aggregateRating,review)) },

      //   // { namespace: "custom", key: "facebookTitle", type: "json", value:JSON.stringify(   SEO?.socialOptimization.facebookTitle) },
      //   // { namespace: "custom", key: "facebookDescription", type: "json", value: JSON.stringify( SEO?.socialOptimization.facebookDescription ) },
      //   // { namespace: "custom", key: "tiktokTitle", type: "json", value:JSON.stringify(   SEO?.socialOptimization.tiktokTitle) },
      //   // { namespace: "custom", key: "pinterestTitle", type: "json", value:JSON.stringify(  SEO?.socialOptimization.pinterestTitle) },
      //   // { namespace: "custom", key: "pinterestDescription", type: "json", value:JSON.stringify(SEO?.socialOptimization.pinterestDescription)    },


      // ]
    });
  }

  async function throttledUpdates(products, batchSize = 100, delayMs = 500) {
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (prod) => {
          const response = await admin.graphql(productsupdated, { variables: { product: prod } })

          const json = await response.json()
          if (json.error) {
            throw new Error(JSON.stringify(json.errors))
          }
          return json
        }

        )
      );

      results.forEach((res, idx) => {
        if (res.status === "rejected") {
          console.error(`Update failed for product ${batch[idx].id}`, res.reason);
        }
      });

      if (i + batchSize < products.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  // 4️⃣ Run throttled updates
  await throttledUpdates(updateProducts, 2, 500);

  // const queue =context.cloudflare.env.SEO_QUEUE

  // const payload = {
  //   shop: session.shop,
  //   sessionId: session.id,
  //   accessToken: session.accessToken,
  //   products: updatedDescreptionAI
  // };
  // const compressedBase64 = ultraCompress(payload);

  // await queue.send({
  //   body: compressedBase64
  // });
  // const compressed = pako.gzip(JSON.stringify(payload));
  //  const compressedBase64 = uint8ToBase64(compressed);
  //  await queue.send({
  //   body: compressedBase64 // body must be a string according to queue type
  // });
  
  
  
  
  return Response.json({
    status: "queued",
    total: updatedDescreptionAI.length
  })



}





interface Variant {
  id: string;
  title: string;
  descriptionHtml: string;
  tags: string[];
  handle: string;
  vendor: string;
  productType: string;
  inventoryQuantity?: number;
  inventoryPolicy?: string;
  totalInventory?: number
  tracksInventory?: boolean
  featuredMedia?: {
    image?: {
      url: string;
      altText?: string;
    };
  };
  priceRangeV2?: {
    maxVariantPrice?: {
      amount: string
      currencyCode: string
    }

    minVariantPrice?: {
      amount: string
      currencyCode: string
    }

  }
  media?: {
    edges?: string[]
  };
  variants?: {
    edges?: string[]
  }
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string;
  startCursor: string;
}

interface LoaderData {
  variants: Variant[];
  pageInfo: PageInfo;
}

// Your exact selection structure
interface SelectedVariant {
  id: string;
  descreption: string;  // Note: matches your spelling
  tags: string[];
  handel: string;       // Note: matches your spelling
  vendor: string;
  image: string;
  productType: string;

}

// Loader & Action


export default function DescriptionManager() {
  // Hooks
  const initial = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const submit = useSubmit();
  const actionData = useActionData<{ success?: boolean; error?: string }>();
  const navigation = useNavigation();
  const { smDown } = useBreakpoints();

  // State
  const [rows, setRows] = useState<Variant[]>(initial?.variants || []);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(initial?.pageInfo || null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [selected, setSelected] = useState<SelectedVariant[]>([]);
  const [isSelectAllIndeterminate, setIsSelectAllIndeterminate] = useState(false);
  // console.log("rows is her see",rows)
  // console.log('intital data is her ',initial)
  // console.log("fetch is her succes",fetcher)
  const isLoading = fetcher.state === "loading";
  const isSubmitting = navigation.state === "submitting";

  // Update rows when fetcher data changes
  useEffect(() => {
    if (fetcher.data) {
      setRows(fetcher.data.variants);
      setPageInfo(fetcher.data.pageInfo);
      // Keep existing selections that are still in new rows, remove others
      setSelected((prev) =>
        prev.filter((s) => fetcher?.data?.variants.some((v: Variant) => v.id === s.id))
      );
    }
  }, [fetcher.data]);

  // Update select all checkbox state
  useEffect(() => {
    if (rows.length === 0) {
      setIsSelectAllIndeterminate(false);
      return;
    }
    const allSelected = rows.every((v) => selected.some((s) => s.id === v.id));
    const someSelected = rows.some((v) => selected.some((s) => s.id === v.id));
    setIsSelectAllIndeterminate(someSelected && !allSelected);
  }, [selected, rows]);

  // Check if a variant is selected
  const isSelected = useCallback((id: string) => {
    return selected.some((s) => s.id === id);
  }, [selected]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allSelected: SelectedVariant[] = rows.map((v) => ({
        id: v.id,
        descreption: v.descriptionHtml || "",
        tags: v.tags || [],
        handel: v.handle,
        vendor: v.vendor,
        image: v.featuredMedia?.image?.url || "",
        images: v?.media?.edges,
        productType: v.productType,
        title: v.title,
        totalInventory: v?.totalInventory,
        tracksInventory: v?.tracksInventory,
        max_amount: v?.priceRangeV2?.maxVariantPrice?.amount,
        currencyCode: v?.priceRangeV2?.maxVariantPrice?.currencyCode,
        min_amount: v.priceRangeV2?.minVariantPrice?.amount,
        sku: v?.variants?.edges



      }));
      setSelected(allSelected);
    } else {
      setSelected([]);
    }
  }, [rows]);

  // Handle individual row selection
  const handleSelectRow = useCallback((variant: Variant, checked: boolean) => {
    if (checked) {
      setSelected((prev) => [
        ...prev,
        {
          id: variant.id,
          descreption: variant.descriptionHtml || "",
          tags: variant.tags || [],
          handel: variant.handle,
          vendor: variant.vendor,
          image: variant.featuredMedia?.image?.url || "",
          images: variant?.media?.edges,
          productType: variant.productType,
          title: variant.title,
          totalInventory: variant?.totalInventory,
          tracksInventory: variant?.tracksInventory,
          max_amount: variant?.priceRangeV2?.maxVariantPrice?.amount,
          currencyCode: variant?.priceRangeV2?.maxVariantPrice?.currencyCode,
          min_amount: variant.priceRangeV2?.minVariantPrice?.amount,
          sku: variant?.variants?.edges


        },
      ]);
    } else {
      setSelected((prev) => prev.filter((s) => s.id !== variant.id));
    }
  }, []);

  // Toggle row selection (add if not exists, remove if exists)
  const toggleSelection = useCallback((variant: Variant) => {
    const exists = selected.some((s) => s.id === variant.id);
    if (exists) {
      setSelected((prev) => prev.filter((s) => s.id !== variant.id));
    } else {
      setSelected((prev) => [
        ...prev,
        {
          id: variant.id,
          descreption: variant.descriptionHtml || "",
          tags: variant.tags || [],
          handel: variant.handle,
          vendor: variant.vendor,
          image: variant.featuredMedia?.image?.url || "",
          productType: variant.productType,
        },
      ]);
    }
  }, [selected]);
  // Auto-select variants without DESC_AI tag
  const handleAutoSelect = useCallback(() => {
    const newSelected: SelectedVariant[] = rows
      .filter((v) => !v.tags?.includes("DESC_AI"))
      .map((v) => ({
        id: v.id,
        descreption: v.descriptionHtml || "",
        tags: v.tags || [],
        handel: v.handle,
        vendor: v.vendor,
        image: v.featuredMedia?.image?.url || "",
        productType: v.productType,
      }));
    setSelected(newSelected);
  }, [rows]);

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      setCursorStack((prev) => [...prev, pageInfo.endCursor]);
      fetcher.load(`?cursor=${pageInfo.endCursor}`);
    }
  }, [pageInfo, fetcher]);

  const handlePreviousPage = useCallback(() => {
    if (cursorStack.length > 0) {
      const newStack = cursorStack.slice(0, -1);
      setCursorStack(newStack);
      const prevCursor = newStack[newStack.length - 1];
      fetcher.load(prevCursor ? `?cursor=${prevCursor}` : "?cursor=");
    }
  }, [cursorStack, fetcher]);

  // Submit handler
  const handleSubmit = useCallback(() => {
    if (selected.length === 0) return;

    const formData = new FormData();
    formData.append("descreptionAI", JSON.stringify(selected));

    submit(formData, {
      method: "post",
      encType: "application/x-www-form-urlencoded",
    });
  }, [selected, submit]);
  console.log('selected is her ', selected)
  // Table headings with Select All checkbox
  const headings = [
    <Checkbox
      key="select-all"
      label="Select all variants"
      labelHidden
      checked={rows.length > 0 && rows.every((v) => isSelected(v.id))}
      indeterminate={isSelectAllIndeterminate}
      onChange={handleSelectAll}
      disabled={rows.length === 0}
    />,
    "Image",
    "Product Details",
    "Description",
    "Tags",
    "Handle",
  ];
  // console.log('rows is seccesfuly her ',rows)
  // Table rows
  const rowsData = useMemo(() => {
    return rows.map((variant) => [
      <Checkbox
        key={`checkbox-${variant.id}`}
        label={`Select ${variant.title}`}
        labelHidden
        checked={isSelected(variant.id)}
        onChange={(checked) => handleSelectRow(variant, checked)}
      />,
      <Thumbnail
        key={`thumb-${variant.id}`}
        source={variant.featuredMedia?.image?.url || ""}
        alt={variant.featuredMedia?.image?.altText || variant.title}
        size="medium"
      />,
      <BlockStack key={`details-${variant.id}`} gap="100">
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {variant.title}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {variant.vendor} • {variant.productType}
        </Text>
        <Text as="span" variant="bodySm" fontWeight="medium" fontFamily="monospace">
          ID: {variant.id.split("/").pop()}
        </Text>
      </BlockStack>,
      <Box key={`desc-${variant.id}`} maxWidth="300px">
        <div
          style={{
            maxHeight: "80px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            fontSize: "13px",
            lineHeight: "1.4",
            color: variant.descriptionHtml ? "inherit" : "#999",
          }}
          dangerouslySetInnerHTML={{
            __html: variant.descriptionHtml || "<em>No description available</em>",
          }}
        />
      </Box>,
      <InlineStack key={`tags-${variant.id}`} gap="100" wrap>
        {variant.tags?.length > 0 ? (
          variant.tags.map((tag) => (
            <Tag key={tag} tone={tag === "DESC_AI" ? "success" : "neutral"}>
              {tag}
            </Tag>
          ))
        ) : (
          <Text as="span" tone="subdued" variant="bodySm">
            No tags
          </Text>
        )}
      </InlineStack>,
      <Text key={`handle-${variant.id}`} as="span" variant="bodySm" tone="subdued" breakWord>
        /{variant.handle}
      </Text>,
    ]);
  }, [rows, isSelected, handleSelectRow]);

  // Empty state
  if (rows.length === 0 && !isLoading) {
    return (
      <Page title="Description Manager">
        <Card>
          <EmptyState
            heading="No variants found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>There are no product variants to display.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Description Manager"
      subtitle={`${selected.length} variants selected for update`}
      primaryAction={
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={selected.length === 0}
        >
          Update Descriptions
        </Button>
      }
      secondaryActions={[
        {
          content: "Refresh",
          onAction: () => fetcher.load(window.location.search),
          loading: isLoading,
        },
      ]}
    >
      <BlockStack gap="400">
        {/* Status Banners */}
        {actionData?.success && (
          <Banner title="Success" tone="success" onDismiss={() => { }}>
            <p>Successfully updated {selected.length} product descriptions.</p>
          </Banner>
        )}
        {actionData?.error && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {/* Stats Bar */}
        <Card padding="400">
          <InlineStack gap="400" align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="400">
              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Total on Page
                </Text>
                <Text as="p" variant="headingMd">
                  {rows.length}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Selected
                </Text>
                <Text as="p" variant="headingMd" tone="success">
                  {selected.length}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Already Processed
                </Text>
                <Text as="p" variant="headingMd">
                  {rows.filter((v) => v.tags?.includes("DESC_AI")).length}
                </Text>
              </Box>
            </InlineStack>

            <Tooltip content="Select variants without DESC_AI tag">
              <Button
                size="slim"
                onClick={handleAutoSelect}
                disabled={rows.filter((v) => !v.tags?.includes("DESC_AI")).length === 0}
              >
                Auto-select New
              </Button>
            </Tooltip>
          </InlineStack>
        </Card>

        {/* Data Table */}
        <Card padding="0">
          {isLoading ? (
            <Box padding="600" alignItems="center" display="flex" justifyContent="center">
              <Spinner size="large" />
            </Box>
          ) : (
            <>
              <DataTable
                columnContentTypes={[
                  "text", // Checkbox
                  "text", // Image
                  "text", // Details
                  "text", // Description
                  "text", // Tags
                  "text", // Handle
                ]}
                headings={headings}
                rows={rowsData}
                verticalAlign="middle"
                hoverable
                truncate={false}
              />

              {/* Pagination */}
              <Divider />
              <Box padding="400">
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={cursorStack.length > 0}
                    onPrevious={handlePreviousPage}
                    hasNext={pageInfo?.hasNextPage || false}
                    onNext={handleNextPage}
                    label={`Page ${cursorStack.length + 1}`}
                  />
                </InlineStack>
              </Box>
            </>
          )}
        </Card>

        {/* Debug: Show selected data structure */}
        {process.env.NODE_ENV === "development" && selected.length > 0 && (
          <Card>
            <Box padding="400">
              <Text as="h3" variant="headingSm">Debug: Selected Data Structure</Text>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <pre style={{ fontSize: "11px", overflow: "auto" }}>
                  {JSON.stringify(selected.slice(0, 2), null, 2)}
                  {selected.length > 2 && `\n... and ${selected.length - 2} more`}
                </pre>
              </Box>
            </Box>
          </Card>
        )}

        {/* Mobile Bulk Actions */}
        {smDown && selected.length > 0 && (
          <Box
            position="fixed"
            insetBlockEnd="0"
            insetInlineStart="0"
            insetInlineEnd="0"
            padding="400"
            background="bg-surface"
            borderBlockStartWidth="100"
            borderColor="border"
            zIndex="100"
          >
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              Update {selected?.length} Descriptions
            </Button>
          </Box>
        )}
      </BlockStack>
    </Page>
  );
}




export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor')
  console.log('cursor her ', cursor)
  let query = `#graphql
  query GetProducts($cursor:String) {
    products(first: 80,after:$cursor,query:"tag_not:DESC_AI",sortKey: CREATED_AT
  reverse: true) {
        edges{
            node{

              


              category{
                ancestorIds
                fullName
                id
                isLeaf
                name
                parentId
                attributes(first:25){
                  edges{
                    node{
                    ... on  TaxonomyAttribute{
                        id
                      }
                      ... on TaxonomyChoiceListAttribute{
                        id
                        name
                        
                      }
                      ... on TaxonomyMeasurementAttribute {
                        id
                        name
                        options{
                          key value
                        }
                      }
                    }
                  }
                }
              }
              publishedAt
              createdAt
              totalInventory
              tracksInventory
              updatedAt
              productParents(first:1) {
                  edges{
                    node{
                      totalInventory
                      tracksInventory
                      title
                      updatedAt
                      vendor
                      publishedAt
                      createdAt
                      productType
                      
                      onlineStorePreviewUrl
                      id
                      hasOutOfStockVariants
                      hasOnlyDefaultVariant
                      handle
                    }
                  }
              }

              priceRangeV2{
                maxVariantPrice{
                   amount
                   currencyCode
                }
                minVariantPrice{
                  amount
                   currencyCode
                }
              }
              productType

              options(first: 8) {
                id
                name
                linkedMetafield{
                  namespace
                  key
                }
                position
                values
                optionValues{
                  hasVariants
                  id
                  linkedMetafieldValue
                  name
                  swatch{
                    color
                    image{
                      id
                      alt
                      image{
                        url
                        id
                      }
                    }
                  }
                  
                  
                }
              }
                title
                id
                descriptionHtml
                tags
                handle
                vendor
                featuredMedia {
          ... on MediaImage {
            id
            image {
              url
              altText
              width
              height
            }
          }
        }
                media(first: 10) {
                  edges{
                    node{
                      ... on MediaImage {
                id
                image {
                  url
                  altText
                  width
                  height
                }
              }
                      # alt
                      # id
                      # preview{
                      #   image{
                      #     id
                      #     altText
                      #     thumbhash
                      #     # url{
                      #     #   transform{
                      #     #     scale
                      #     #   }
                      #     # }

                      #   }
                      # }
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      sku
                      id
                      title
                      price
                      barcode
                      compareAtPrice
                      inventoryPolicy
                      unitPrice{
                        amount
                        currencyCode
                      }
                     
                      selectedOptions{
                        name
                        value
                        optionValue{
                          id
                          name
                          hasVariants
                          linkedMetafieldValue
                          swatch{
                            color
                            image{
                              id 
                              alt
                              image{
                                id
                                url
                              }
                            }
                          }
                        }
                      }
                      inventoryItem{
                        countryCodeOfOrigin
                   
                        inventoryLevels(first: 10) {
                          edges {
                            node {
                              location{
                                id
                                activatable
                                address{
                                  address1
                                  address2
                                  city
                                  country
                                  countryCode
                                  formatted
                                  province
                                  
                                  zip
                                }
                              }
                            }
                          }
                        }

                        countryHarmonizedSystemCodes(first:5) {
                          edges {
                            node {
                              countryCode
                              harmonizedSystemCode
                            }
                          }
                        }

                        sku
                        provinceCodeOfOrigin
                        requiresShipping
                        trackedEditable{
                          locked
                          reason
                        }
                        
                        tracked
                        
                      }
                    }
                  }
                }
            }
        }
        nodes{
          category{
            ancestorIds
            childrenIds
            fullName
            isLeaf
            isRoot
            level
            name
            parentId
          }
        }
      
      pageInfo{
        endCursor
        hasNextPage
      }
    }
  
  }
  `
  const response = await admin.graphql(query, { variables: { cursor } });
  const res = await response.json();
  // console.log('res is her ',res.data)
  const productsdescreption = {
    variants: res?.data.products.edges.map((e: any) => e.node),
    pageInfo: res?.data.products.pageInfo,
    category: res?.data.products.nodes.map((e: any) => e.category)
  }
  return new Response(JSON.stringify(productsdescreption), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
  //   return json.data;
}
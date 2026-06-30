import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, Form, useNavigation, useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import { shopify } from "../shopify.server";
import { Badge, Banner, BlockStack, Box, Button, Card, Checkbox, EmptyState, InlineStack, Modal, Page, Pagination, Spinner, Tag, Text, Thumbnail, Tooltip, useBreakpoints } from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
// sk-c8552ae161ed4db684bb1268bf4ba758

import { sendPrompt } from "./functions/deepseekai/deepseekai";
import { buildPrompt } from "./functions/propmtsSEO/propmts_descreption";
import { ultraCompress } from "./functions/uint8ToBase64/brotliCompressSync";
interface DESCREPTION {
  descreption: string,
  id: string,
  tags: string[]
}

export interface VARIBALES {
  handle: string;
  id: string;
  descreption: string;
  vendor: string;
  title: string;
  totalInventory: number;
  tracksInventory: number;
  max_amount: string;
  currencyCode: string;
  min_amount: string;
}
export const allResults: any[] = [];
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export async function generateSeoHtml(updatedDescreptionAI: any, DEEP_SEEK_API_KEY: string) {
  // console.log("prodycts pronti in updatedDescreptionAI",updatedDescreptionAI)

  const BATCH_SIZE = 1;




  const chunks = chunkArray(updatedDescreptionAI, BATCH_SIZE);






  const chunkPromises = chunks.map(async (chunk, idx) => {
    // console.log(`Processing chunk ${idx + 1}/${chunks.length} (${chunk.length} products) - split into 2 API calls`);

    // Call 1: shortDescription only (keeps output under token limit)
    const shortPrompt = buildPrompt(chunk as VARIBALES[], 'shortDescription');
    // Call 2: detailedDescription only
    const detailedPrompt = buildPrompt(chunk as VARIBALES[], 'detailedDescription');

    let shortResults: { id: string; shortDescription?: string }[] = [];
    let detailedResults: { id: string; detailedDescription?: string }[] = [];

    try {
      [shortResults, detailedResults] = await Promise.all([
        sendPrompt(shortPrompt, DEEP_SEEK_API_KEY) as Promise<{ id: string; shortDescription?: string }[]>,
        sendPrompt(detailedPrompt, DEEP_SEEK_API_KEY) as Promise<{ id: string; detailedDescription?: string }[]>
      ]);
    } catch (err) {
      console.error(`Error processing chunk ${idx + 1}:`, err);
      throw err;
    }

    if (!Array.isArray(shortResults) || !Array.isArray(detailedResults)) {
      throw new Error(`Chunk ${idx + 1} returned invalid format`);
    }

    // Merge by id: { id, shortDescription, detailedDescription }
    const merged = (chunk as { id: string; descreption: string }[]).map((p: { id: string; descreption: string }) => {
      const short = shortResults.find((r) => r.id === p.id);
      const detailed = detailedResults.find((r) => r.id === p.id);
      return {
        id: p.id,
        shortDescription: short?.shortDescription ?? '',
        detailedDescription: detailed?.detailedDescription ?? ''
      };
    });

    return merged;
  });

  // Wait for all chunks to complete
  const results = await Promise.all(chunkPromises);

  // Flatten results into a single array
  results.forEach(r => allResults.push(...r));

  // console.log(`Total products processed: ${allResults.length}/${updatedDescreptionAI.length}`);

  return allResults;






}




// 2. Remix Action (Server Side)
export async function action({ context, request }: ActionFunctionArgs) {
  let { admin } = await shopify(context).authenticate.admin(request)
  let { session } = await shopify(context).authenticate.admin(request)

  let formData = await request.formData()
  const updatedDescreptionAI: DESCREPTION = JSON.parse(formData.get('descreptionAI') as string);
  if (!Array.isArray(updatedDescreptionAI)) {
    console.error("Invalid or missing 'descreptionAI' data");
    return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
  }
  const queue = context.cloudflare.env.SEO_QUEUE

  const payload = {
    shop: session.shop,
    sessionId: session.id,
    accessToken: session.accessToken,
    products: updatedDescreptionAI
  };
  const compressedBase64 = ultraCompress(payload);

  await queue.send({
    body: compressedBase64
  });
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
  images?: any;
  productType: string;
  title?: string;
  totalInventory?: number;
  tracksInventory?: boolean;
  max_amount?: string;
  currencyCode?: string;
  min_amount?: string;
  sku?: any;

}

// Loader & Action


export default function DescriptionManager() {
  // Hooks
  const [activeDesc, setActiveDesc] = useState<string | null>(null);
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

  const buildSelectedVariant = useCallback((variant: Variant): SelectedVariant => ({
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
    sku: variant?.variants?.edges,
  }), []);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allSelected: SelectedVariant[] = rows.map(buildSelectedVariant);
      setSelected(allSelected);
    } else {
      setSelected([]);
    }
  }, [buildSelectedVariant, rows]);

  // Handle individual row selection
  const handleSelectRow = useCallback((variant: Variant, checked: boolean) => {
    if (checked) {
      setSelected((prev) => [
        ...prev,
        buildSelectedVariant(variant),
      ]);
    } else {
      setSelected((prev) => prev.filter((s) => s.id !== variant.id));
    }
  }, [buildSelectedVariant]);

  // Toggle row selection (add if not exists, remove if exists)
  const toggleSelection = useCallback((variant: Variant) => {
    const exists = selected.some((s) => s.id === variant.id);
    if (exists) {
      setSelected((prev) => prev.filter((s) => s.id !== variant.id));
    } else {
      setSelected((prev) => [
        ...prev,
        buildSelectedVariant(variant),
      ]);
    }
  }, [buildSelectedVariant, selected]);
  // Auto-select variants without DESC_AI tag
  const handleAutoSelect = useCallback(() => {
    const newSelected: SelectedVariant[] = rows
      .filter((v) => !v.tags?.includes("DESC_AI"))
      .map(buildSelectedVariant);
    setSelected(newSelected);
  }, [buildSelectedVariant, rows]);

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
  const processedCount = useMemo(
    () => rows.filter((v) => v.tags?.includes("DESC_AI")).length,
    [rows]
  );
  const pendingCount = Math.max(rows.length - processedCount, 0);
  const selectAllChecked = isSelectAllIndeterminate
    ? "indeterminate"
    : rows.length > 0 && rows.every((v) => isSelected(v.id));
  const getDescriptionPreview = useCallback((html = "") => {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text || "No description available";
  }, []);

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
        <Text as="span" variant="bodySm" fontWeight="medium">
          ID: {variant.id.split("/").pop()}
        </Text>
      </BlockStack>,

      <Box key={`desc-${variant.id}`} maxWidth="300px">
        <div
          onClick={() => setActiveDesc(variant.descriptionHtml || "")}
          style={{
            maxHeight: "80px",
            overflow: "hidden",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            display: "-webkit-box",
            cursor: "pointer",
            fontSize: "13px",
            lineHeight: "1.4",
            color: "#2563eb",
          }}
          dangerouslySetInnerHTML={{
            __html: variant.descriptionHtml || "<em>No description available</em>",
          }}
        />
        <Text as="span" tone="subdued" variant="bodySm">
          Click to expand
        </Text>
      </Box>,

      <InlineStack key={`tags-${variant.id}`} gap="100" wrap>
        {variant.tags?.length > 0 ? (
          variant.tags.map((tag) => (
            <Tag key={tag}>
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
          <InlineStack gap="400" align="space-between" blockAlign="center" wrap>
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                TikTok Shop policy update
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Review products, select clean listings, then update title and description.
              </Text>
            </BlockStack>

            <InlineStack gap="300" blockAlign="center" wrap>
              {[
                { label: "Total", value: rows.length },
                { label: "To update", value: pendingCount },
                { label: "Selected", value: selected.length },
                { label: "Done", value: processedCount },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    minWidth: "88px",
                    padding: "10px 12px",
                    border: "1px solid #e3e3e3",
                    borderRadius: "8px",
                    background: "#fafafa",
                  }}
                >
                  <Text as="p" variant="bodySm" tone="subdued">
                    {stat.label}
                  </Text>
                  <Text as="p" variant="headingMd">
                    {stat.value}
                  </Text>
                </div>
              ))}

              <Tooltip content="Select products without DESC_AI tag">
                <Button
                  onClick={handleAutoSelect}
                  disabled={pendingCount === 0}
                >
                  Auto-select new
                </Button>
              </Tooltip>
            </InlineStack>
          </InlineStack>
        </Card>

        {/* Product Table */}
        <Card padding="0">
          {isLoading ? (
            <div
              style={{
                minHeight: "280px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spinner size="large" />
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #ebebeb",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Product queue
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Products without the DESC_AI tag appear first for review.
                  </Text>
                </BlockStack>
                <Badge tone={pendingCount > 0 ? "attention" : "success"}>
                  {pendingCount > 0 ? `${pendingCount} pending` : "All clear"}
                </Badge>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: "920px",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "48px", padding: "12px 14px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Checkbox
                          label="Select all products"
                          labelHidden
                          checked={selectAllChecked}
                          onChange={handleSelectAll}
                          disabled={rows.length === 0}
                        />
                      </th>
                      <th style={{ width: "82px", padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">Image</Text>
                      </th>
                      <th style={{ width: "36%", padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">Product</Text>
                      </th>
                      <th style={{ width: "34%", padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">Current description</Text>
                      </th>
                      <th style={{ width: "170px", padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">Status</Text>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((variant) => {
                      const alreadyProcessed = variant.tags?.includes("DESC_AI");
                      const preview = getDescriptionPreview(variant.descriptionHtml);

                      return (
                        <tr key={variant.id}>
                          <td style={{ padding: "14px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                            <Checkbox
                              label={`Select ${variant.title}`}
                              labelHidden
                              checked={isSelected(variant.id)}
                              onChange={(checked) => handleSelectRow(variant, checked)}
                            />
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                            <Thumbnail
                              source={variant.featuredMedia?.image?.url || ""}
                              alt={variant.featuredMedia?.image?.altText || variant.title}
                              size="medium"
                            />
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                            <BlockStack gap="150">
                              <div
                                style={{
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                <Text as="span" variant="bodyMd" fontWeight="semibold">
                                  {variant.title}
                                </Text>
                              </div>
                              <InlineStack gap="150" blockAlign="center" wrap>
                                {variant.vendor && <Badge>{variant.vendor}</Badge>}
                                {variant.productType && <Text as="span" variant="bodySm" tone="subdued">{variant.productType}</Text>}
                              </InlineStack>
                              <Text as="span" variant="bodySm" tone="subdued">
                                ID {variant.id.split("/").pop()} · /{variant.handle}
                              </Text>
                            </BlockStack>
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                            <button
                              type="button"
                              onClick={() => setActiveDesc(variant.descriptionHtml || "")}
                              style={{
                                width: "100%",
                                border: "1px solid #e3e3e3",
                                borderRadius: "8px",
                                background: "#ffffff",
                                padding: "10px 12px",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  color: "#303030",
                                  fontSize: "13px",
                                  lineHeight: "18px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {preview}
                              </span>
                              <span style={{ color: "#6d7175", fontSize: "12px", marginTop: "6px", display: "block" }}>
                                Click to preview
                              </span>
                            </button>
                          </td>
                          <td style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                            <BlockStack gap="200">
                              <Badge tone={alreadyProcessed ? "success" : "attention"}>
                                {alreadyProcessed ? "Updated" : "New"}
                              </Badge>
                              <InlineStack gap="100" wrap>
                                {(variant.tags || []).slice(0, 2).map((tag) => (
                                  <Badge key={tag}>{String(tag)}</Badge>
                                ))}
                                {(variant.tags || []).length > 2 && (
                                  <Badge>{`+${variant.tags.length - 2}`}</Badge>
                                )}
                              </InlineStack>
                            </BlockStack>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: "16px", borderTop: "1px solid #ebebeb", display: "flex", justifyContent: "center" }}>
                <Pagination
                  hasPrevious={cursorStack.length > 0}
                  onPrevious={handlePreviousPage}
                  hasNext={pageInfo?.hasNextPage || false}
                  onNext={handleNextPage}
                  label={`Page ${cursorStack.length + 1}`}
                />
              </div>
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
              {`Update ${selected.length} Descriptions`}
            </Button>
          </Box>
        )}
      </BlockStack>

      {activeDesc && (
        <Modal
          open={true}
          onClose={() => setActiveDesc(null)}
          title="Product Description"
        >
          <Modal.Section>
            <div
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                paddingRight: "10px",
              }}
              dangerouslySetInnerHTML={{
                __html: activeDesc,
              }}
            />
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}




export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url = new URL(request.url)
  let cursor = url.searchParams.get('cursor')
  console.log('cursor her ', cursor)
  let query = `#graphql
  query GetProducts($cursor:String) {
    products(first: 15,after:$cursor,sortKey: PUBLISHED_AT,reverse: true) {
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
  // Nel loader — dopo aver ricevuto la response
  let MAX_PAGES = 10;
  let pageCount = 1;
  let resultData: any = { variants: [], pageInfo: {}, category: [] };

  while (pageCount <= MAX_PAGES) {

    const response = await admin.graphql(query, { variables: { cursor } });
    const res = await response.json();

    let pageInfo = res?.data?.products?.pageInfo || {};
    const edges = res?.data?.products?.edges ?? [];

    const filtered = edges
      .map((e: any) => e.node)
      .filter((product: any) => {
        console.log(product.descriptionHtml);
        return (
          typeof product.descriptionHtml === "string" &&
          product.descriptionHtml.includes("size_info")
        );
      })
    //     .map((product: any) => ({
    //   ...product,

    //   // 👇 THIS IS THE IMPORTANT PART
    //   descriptionHtml: transformDescriptionHtml(product.descriptionHtml),
    // }));

    // if (filtered.length > 0) {
    //   resultData = {
    //     // variants: filtered,
    //     varients:edges,
    //     pageInfo: pageInfo,
    //     category: edges.map((e: any) => e.node.category)
    //   };
    //   break;
    // }

    // if (!pageInfo.hasNextPage) {
    //   resultData = {
    //     variants: [],
    //     pageInfo: pageInfo,
    //     category: []
    //   };
    //   break;
    // }
    resultData = {
      // variants: filtered,
      varients: edges,
      pageInfo: pageInfo,
      category: edges.map((e: any) => e.node.category)
    };
    cursor = pageInfo.endCursor;
    pageCount++;
  }
//hello
  return new Response(JSON.stringify(resultData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
  //   return json.data;
}

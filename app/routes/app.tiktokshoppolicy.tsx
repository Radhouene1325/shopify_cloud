import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  EmptyState,
  InlineStack,
  Modal,
  Page,
  Pagination,
  Spinner,
  Text,
  Thumbnail,
  Tooltip,
  useBreakpoints,
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { shopify } from "../shopify.server";
import { sendPrompt } from "./functions/deepseekai/deepseekai";
import { buildTikTokPrompt } from "./functions/propmtsSEO/prompts_description_tiktok";
import { productsupdated } from "./functions/query/updateprooductquery";

const UPDATED_TAG = "DESC_AI";
const HISTORY_NAMESPACE = "custom";
const HISTORY_TITLE_KEY = "history_title";
const HISTORY_DESCRIPTION_KEY = "history_description";

export async function generateSeoHtml(
  updatedDescreptionAI: any,
  DEEP_SEEK_API_KEY: string
) {
  const products = updatedDescreptionAI.map((product: any) => ({
    ...product,
    id: product.id || "",
    handle: product.handle || product.handel || "",
    title: product.title || "",
    vendor: product.vendor || "",
    descreption: product.descreption || product.description || product.descriptionHtml || "",
    totalInventory: product.totalInventory || 0,
    tracksInventory: Number(product.tracksInventory || 0),
    max_amount: product.max_amount || "",
    currencyCode: product.currencyCode || "",
    min_amount: product.min_amount || "",
  }));

  const data: any[] = [];

  for (const [idx, product] of products.entries()) {
    const prompt = buildTikTokPrompt(product, "shortDescription");
    const promptResults = await sendPrompt(prompt, DEEP_SEEK_API_KEY) as any[];

    if (!Array.isArray(promptResults)) {
      throw new Error(`Product ${idx + 1} returned invalid TikTok description format`);
    }

    const generated = promptResults.find((item) => item.id === product.id);

    data.push({
      id: product.id,
      title: product.title,
      descriptionHtml: generated?.shortDescription || generated?.description || "",
    });
  }

  return {
    total: data.length,
    data,
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { admin } = await shopify(context).authenticate.admin(request);

  const formData = await request.formData();
  const rawProducts = formData.get("descreptionAI");

  if (typeof rawProducts !== "string") {
    return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
  }

  let products: any[];

  try {
    products = JSON.parse(rawProducts);
  } catch {
    return Response.json({ error: "Invalid JSON in 'descreptionAI' data" }, { status: 400 });
  }

  if (!Array.isArray(products)) {
    return Response.json({ error: "Invalid or missing 'descreptionAI' data" }, { status: 400 });
  }

  const deepSeekApiKey = (context.cloudflare.env as Record<string, string | undefined>)
    .DEEP_SEEK_API_KEY;

  if (!deepSeekApiKey) {
    return Response.json({ error: "Missing DEEP_SEEK_API_KEY" }, { status: 500 });
  }

  const result = await generateSeoHtml(products, deepSeekApiKey);
  const updatedData: any[] = [];
  const historyMetafieldsQuery = `#graphql
    query GetTikTokHistoryMetafields($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          descriptionHtml
          tags
          historyTitle: metafield(namespace: "custom", key: "history_title") {
            id
            value
          }
          historyDescription: metafield(namespace: "custom", key: "history_description") {
            id
            value
          }
        }
      }
    }
  `;
  const historyResponse = await admin.graphql(historyMetafieldsQuery, {
    variables: { ids: result.data.map((product) => product.id) },
  });
  const historyJson = await historyResponse.json() as any;
  const shopifyProductsById = new Map(
    (historyJson?.data?.nodes || [])
      .filter(Boolean)
      .map((product: any) => [product.id, product])
  );

  for (const product of result.data) {
    const originalProduct = products.find((item: any) => item.id === product.id);

    if (!originalProduct) {
      return Response.json(
        {
          error: "Generated product does not match original selected product",
          productId: product.id,
          data: result.data,
        },
        { status: 400 }
      );
    }

    if (!product.descriptionHtml) {
      return Response.json(
        {
          error: "AI returned empty TikTok Shop description",
          productId: product.id,
          data: result.data,
        },
        { status: 400 }
      );
    }

    const shopifyProduct = shopifyProductsById.get(product.id) as any;

    if (!shopifyProduct) {
      return Response.json(
        {
          error: "Product not found before TikTok Shop update",
          productId: product.id,
          data: result.data,
        },
        { status: 400 }
      );
    }

    const metafields = [];
    const oldTitle = shopifyProduct.title || originalProduct.title || "";
    const oldDescriptionHtml =
      shopifyProduct.descriptionHtml ||
      originalProduct.descriptionHtml ||
      originalProduct.descreption ||
      "";

    if (!shopifyProduct.historyTitle?.value) {
      metafields.push({
        namespace: HISTORY_NAMESPACE,
        key: HISTORY_TITLE_KEY,
        type: "single_line_text_field",
        value: oldTitle,
      });
    }

    if (!shopifyProduct.historyDescription?.value) {
      metafields.push({
        namespace: HISTORY_NAMESPACE,
        key: HISTORY_DESCRIPTION_KEY,
        type: "multi_line_text_field",
        value: oldDescriptionHtml,
      });
    }

    const tags = Array.from(
      new Set([...(shopifyProduct.tags || originalProduct.tags || []), UPDATED_TAG].filter(Boolean))
    );
    const productUpdate: any = {
      id: product.id,
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      tags,
    };

    if (metafields.length > 0) {
      productUpdate.metafields = metafields;
    }

    const response = await admin.graphql(productsupdated, {
      variables: {
        product: productUpdate,
      },
    });

    const json = await response.json() as any;
    const userErrors = json?.data?.productUpdate?.userErrors || [];

    if (userErrors.length > 0) {
      return Response.json(
        {
          error: "Failed to update TikTok Shop description",
          productId: product.id,
          userErrors,
          data: result.data,
        },
        { status: 400 }
      );
    }

    updatedData.push({
      id: product.id,
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      tags,
    });
  }

  return Response.json({
    success: true,
    total: updatedData.length,
    data: updatedData,
  });
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { admin } = await shopify(context).authenticate.admin(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const query = `#graphql
    query GetTikTokPolicyProducts($cursor: String) {
      products(first: 15, after: $cursor, query: "tag_not:DESC_AI", sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            id
            title
            descriptionHtml
            tags
            handle
            vendor
            productType
            totalInventory
            tracksInventory
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
            priceRangeV2 {
              maxVariantPrice {
                amount
                currencyCode
              }
              minVariantPrice {
                amount
                currencyCode
              }
            }
            media(first: 10) {
              edges {
                node {
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
                }
              }
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }
  `;

  const response = await admin.graphql(query, { variables: { cursor } });
  const json = (await response.json()) as {
    data?: {
      products?: {
        edges?: Array<{ node: any }>;
        pageInfo?: any;
      };
    };
  };

  const variants = json.data?.products?.edges?.map((edge) => edge.node) || [];
  const pageInfo = json.data?.products?.pageInfo || {};
  const data = variants.map((product: any) => ({
    id: product.id,
    title: product.title,
    descriptionHtml: product.descriptionHtml || "",
  }));

  return Response.json({
    variants,
    data,
    pageInfo,
  });
};

interface Variant {
  id: string;
  title: string;
  descriptionHtml: string;
  tags: string[];
  handle: string;
  vendor: string;
  productType: string;
  totalInventory?: number;
  tracksInventory?: boolean;
  featuredMedia?: {
    image?: {
      url: string;
      altText?: string;
    };
  };
  priceRangeV2?: {
    maxVariantPrice?: {
      amount: string;
      currencyCode: string;
    };
    minVariantPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
  media?: {
    edges?: unknown[];
  };
  variants?: {
    edges?: unknown[];
  };
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

interface SelectedVariant {
  id: string;
  descreption: string;
  tags: string[];
  handel: string;
  vendor: string;
  image: string;
  images?: unknown[];
  productType: string;
  title?: string;
  totalInventory?: number;
  tracksInventory?: boolean;
  max_amount?: string;
  currencyCode?: string;
  min_amount?: string;
  sku?: unknown[];
}

function DescriptionManager() {
  const [activeDesc, setActiveDesc] = useState<string | null>(null);
  const initial = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const submit = useSubmit();
  const actionData = useActionData<{ success?: boolean; error?: string }>();
  const navigation = useNavigation();
  const { smDown } = useBreakpoints();

  const [rows, setRows] = useState<Variant[]>(initial?.variants || []);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(initial?.pageInfo || null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [selected, setSelected] = useState<SelectedVariant[]>([]);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [isSelectAllIndeterminate, setIsSelectAllIndeterminate] = useState(false);

  const isLoading = fetcher.state === "loading";
  const isSubmitting = navigation.state === "submitting";

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(rows.flatMap((variant) => variant.tags || []).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (selectedTagFilters.length === 0) return rows;

    return rows.filter((variant) =>
      selectedTagFilters.every((tag) => variant.tags?.includes(tag))
    );
  }, [rows, selectedTagFilters]);

  useEffect(() => {
    if (!fetcher.data) return;

    setRows(fetcher.data.variants);
    setPageInfo(fetcher.data.pageInfo);
    setSelected((prev) =>
      prev.filter((item) => fetcher.data?.variants.some((variant) => variant.id === item.id))
    );
  }, [fetcher.data]);

  useEffect(() => {
    if (rows.length === 0) {
      setIsSelectAllIndeterminate(false);
      return;
    }

    const allSelected = filteredRows.every((variant) =>
      selected.some((item) => item.id === variant.id)
    );
    const someSelected = filteredRows.some((variant) =>
      selected.some((item) => item.id === variant.id)
    );

    setIsSelectAllIndeterminate(someSelected && !allSelected);
  }, [filteredRows, selected]);

  const isSelected = useCallback(
    (id: string) => selected.some((item) => item.id === id),
    [selected]
  );

  const buildSelectedVariant = useCallback(
    (variant: Variant): SelectedVariant => ({
      id: variant.id,
      descreption: variant.descriptionHtml || "",
      tags: variant.tags || [],
      handel: variant.handle,
      vendor: variant.vendor,
      image: variant.featuredMedia?.image?.url || "",
      images: variant.media?.edges,
      productType: variant.productType,
      title: variant.title,
      totalInventory: variant.totalInventory,
      tracksInventory: variant.tracksInventory,
      max_amount: variant.priceRangeV2?.maxVariantPrice?.amount,
      currencyCode: variant.priceRangeV2?.maxVariantPrice?.currencyCode,
      min_amount: variant.priceRangeV2?.minVariantPrice?.amount,
      sku: variant.variants?.edges,
    }),
    []
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const nextSelected = new Map(selected.map((item) => [item.id, item]));
        filteredRows.forEach((variant) => {
          nextSelected.set(variant.id, buildSelectedVariant(variant));
        });
        setSelected(Array.from(nextSelected.values()));
        return;
      }

      setSelected((prev) =>
        prev.filter((item) => !filteredRows.some((variant) => variant.id === item.id))
      );
    },
    [buildSelectedVariant, filteredRows, selected]
  );

  const handleSelectRow = useCallback(
    (variant: Variant, checked: boolean) => {
      if (checked) {
        setSelected((prev) => [...prev, buildSelectedVariant(variant)]);
        return;
      }

      setSelected((prev) => prev.filter((item) => item.id !== variant.id));
    },
    [buildSelectedVariant]
  );

  const handleAutoSelect = useCallback(() => {
    setSelected(
      filteredRows
        .filter((variant) => !variant.tags?.includes(UPDATED_TAG))
        .map(buildSelectedVariant)
    );
  }, [buildSelectedVariant, filteredRows]);

  const handleTagFilterChange = useCallback((tag: string, checked: boolean) => {
    setSelectedTagFilters((prev) => {
      if (checked) {
        return prev.includes(tag) ? prev : [...prev, tag].sort((a, b) => a.localeCompare(b));
      }

      return prev.filter((item) => item !== tag);
    });
  }, []);

  const handleNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) return;

    setCursorStack((prev) => [...prev, pageInfo.endCursor]);
    fetcher.load(`?cursor=${pageInfo.endCursor}`);
  }, [fetcher, pageInfo]);

  const handlePreviousPage = useCallback(() => {
    if (cursorStack.length === 0) return;

    const newStack = cursorStack.slice(0, -1);
    const prevCursor = newStack[newStack.length - 1];

    setCursorStack(newStack);
    fetcher.load(prevCursor ? `?cursor=${prevCursor}` : "?cursor=");
  }, [cursorStack, fetcher]);

  const handleSubmit = useCallback(() => {
    if (selected.length === 0) return;

    const formData = new FormData();
    formData.append("descreptionAI", JSON.stringify(selected));

    submit(formData, {
      method: "post",
      encType: "application/x-www-form-urlencoded",
    });
  }, [selected, submit]);

  const processedCount = useMemo(
    () => filteredRows.filter((variant) => variant.tags?.includes(UPDATED_TAG)).length,
    [filteredRows]
  );
  const pendingCount = Math.max(filteredRows.length - processedCount, 0);
  const selectAllChecked: boolean | "indeterminate" = isSelectAllIndeterminate
    ? "indeterminate"
    : filteredRows.length > 0 && filteredRows.every((variant) => isSelected(variant.id));

  const getDescriptionPreview = useCallback((html = "") => {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text || "No description available";
  }, []);

  if (rows.length === 0 && !isLoading) {
    return (
      <Page title="Description Manager">
        <Card>
          <EmptyState
            heading="No products found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>There are no products to display.</p>
          </EmptyState>
               <div style={{ padding: "16px", borderTop: "1px solid #ebebeb", display: "flex", justifyContent: "center" }}>
                <Pagination
                  hasPrevious={cursorStack.length > 0}
                  onPrevious={handlePreviousPage}
                  hasNext={pageInfo?.hasNextPage || false}
                  onNext={handleNextPage}
                  label={`Page ${cursorStack.length + 1}`}
                />
              </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Description Manager"
      subtitle={`${selected.length} products selected for update`}
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
        {actionData?.success && (
          <Banner title="Success" tone="success" onDismiss={() => {}}>
            <p>Successfully updated the selected products.</p>
          </Banner>
        )}

        {actionData?.error && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

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
                { label: "Visible", value: filteredRows.length },
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

              <Tooltip content={`Select products without ${UPDATED_TAG} tag`}>
                <Button onClick={handleAutoSelect} disabled={pendingCount === 0}>
                  Auto-select new
                </Button>
              </Tooltip>
            </InlineStack>
          </InlineStack>
        </Card>

        <Card padding="400">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center" gap="300" wrap>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  Tag filters
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Select one or more tags to show products that contain all selected tags.
                </Text>
              </BlockStack>

              {selectedTagFilters.length > 0 && (
                <Button onClick={() => setSelectedTagFilters([])}>
                  Clear tag filters
                </Button>
              )}
            </InlineStack>

            {availableTags.length > 0 ? (
              <InlineStack gap="200" wrap>
                {availableTags.map((tag) => (
                  <div
                    key={tag}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #e3e3e3",
                      borderRadius: "8px",
                      background: selectedTagFilters.includes(tag) ? "#f1f8ff" : "#ffffff",
                    }}
                  >
                    <Checkbox
                      label={tag}
                      checked={selectedTagFilters.includes(tag)}
                      onChange={(checked) => handleTagFilterChange(tag, checked)}
                    />
                  </div>
                ))}
              </InlineStack>
            ) : (
              <Text as="p" variant="bodySm" tone="subdued">
                No tags found on this page.
              </Text>
            )}
          </BlockStack>
        </Card>

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
                    Products without the {UPDATED_TAG} tag appear first for review.
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
                          disabled={filteredRows.length === 0}
                        />
                      </th>
                      <th style={{ width: "82px", padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Image
                        </Text>
                      </th>
                      <th style={{ width: "36%", padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Product
                        </Text>
                      </th>
                      <th style={{ width: "34%", padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Current description
                        </Text>
                      </th>
                      <th style={{ width: "170px", padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #ebebeb", background: "#fafafa" }}>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Status
                        </Text>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: "40px 20px",
                            borderBottom: "1px solid #f0f0f0",
                            textAlign: "center",
                          }}
                        >
                          <BlockStack gap="200" inlineAlign="center">
                            <Text as="p" variant="headingSm">
                              No products match the selected tags
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Clear tag filters or choose a different tag combination.
                            </Text>
                            {selectedTagFilters.length > 0 && (
                              <Button onClick={() => setSelectedTagFilters([])}>
                                Clear tag filters
                              </Button>
                            )}
                          </BlockStack>
                        </td>
                      </tr>
                    ) : filteredRows.map((variant) => {
                      const alreadyProcessed = variant.tags?.includes(UPDATED_TAG);
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
                                {variant.productType && (
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {variant.productType}
                                  </Text>
                                )}
                              </InlineStack>
                              <Text as="span" variant="bodySm" tone="subdued">
                                ID {variant.id.split("/").pop()} - /{variant.handle}
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

        {process.env.NODE_ENV === "development" && selected.length > 0 && (
          <Card>
            <Box padding="400">
              <Text as="h3" variant="headingSm">
                Debug: Selected Data Structure
              </Text>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <pre style={{ fontSize: "11px", overflow: "auto" }}>
                  {JSON.stringify(selected.slice(0, 2), null, 2)}
                  {selected.length > 2 && `\n... and ${selected.length - 2} more`}
                </pre>
              </Box>
            </Box>
          </Card>
        )}

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
            <Button variant="primary" fullWidth onClick={handleSubmit} loading={isSubmitting}>
              {`Update ${selected.length} Descriptions`}
            </Button>
          </Box>
        )}
      </BlockStack>

      {activeDesc && (
        <Modal open onClose={() => setActiveDesc(null)} title="Product Description">
          <Modal.Section>
            <div
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                paddingRight: "10px",
              }}
              dangerouslySetInnerHTML={{ __html: activeDesc }}
            />
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}

export { DescriptionManager };
export default DescriptionManager;

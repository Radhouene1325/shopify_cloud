// import {  type ActionFunctionArgs } from "@remix-run/cloudflare"
// import { shopify } from "../shopify.server"

// export const RESOURCE_TYPES = [
//     { label: "Prodotti", value: "PRODUCT" },
//     { label: "Collezioni", value: "COLLECTION" },
//     { label: "Pagine", value: "PAGE" },
//     { label: "Articoli blog", value: "ARTICLE" },
//     { label: "Menu", value: "MENU" },
//     { label: "Metaobject", value: "METAOBJECT" },
//     { label: "Tema", value: "ONLINE_STORE_THEME_LOCALE_CONTENT" },
//     { label: "Notifiche", value: "EMAIL_TEMPLATE" },
//     { label: "Metadati negozio", value: "SHOP" },
//     { label: "Filtri", value: "FILTER" },
// ]

// export const GET_TRANSLATABLE_RESOURCES = `#graphql
//   query getTranslatableResources($type: TranslatableResourceType!, $after: String) {
//     translatableResources(resourceType: $type, first: 50, after: $after) {
//       pageInfo { hasNextPage endCursor }
//       edges {
//         node {
//           resourceId
//           translatableContent {
//             key
//             value
//             digest
//             locale
//           }
//         }
//       }
//     }
//   }
// `

// export const REGISTER_TRANSLATIONS = `#graphql
//   mutation registerTranslations($resourceId: ID!, $translations: [TranslationInput!]!) {
//     translationsRegister(resourceId: $resourceId, translations: $translations) {
//       translations { locale key value }
//       userErrors { field message }
//     }
//   }
// `



// export async function translateWithOllama(
//     fields: { key: string; value: string }[],
//     ollamaUrl: string,
//     apiKey: string
// ): Promise<{ key: string; translated: string }[]> {
//     const input = Object.fromEntries(fields.map(f => [f.key, f.value]))

//     const res = await fetch(`${ollamaUrl}`, {
//         method: "POST",
//         headers: {
//             Authorization: `Bearer ${apiKey}`,
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//             model: "gpt-oss:120b",
//             messages: [
//                 {
//                     role: "system",
//                     content: `
// You are a professional e-commerce translator.
// Translate all values from Italian to English.
// Preserve HTML tags exactly as they are.
// Return ONLY valid JSON with the same keys as input.
//           `.trim(),
//                 },
//                 {
//                     role: "user",
//                     content: JSON.stringify(input),
//                 },
//             ],
//             stream: false,
//             format: "json",
//         }),
//     })

//     if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
//     const data = await res.json()
//     if (!data.message?.content) throw new Error("Ollama returned empty content")

//     const translated = JSON.parse(data.message.content)
//     return fields.map(f => ({
//         key: f.key,
//         translated: translated[f.key] ?? f.value,
//     }))
// }

// export function sleep(ms: number) {
//     return new Promise(r => setTimeout(r, ms))
// }





// export async function action({ context, request }: ActionFunctionArgs) {
//     const { admin } = await shopify(context).authenticate.admin(request)
//     const { OLLAMA_API_KEY } = context.cloudflare.env
//     const OLLAMA_BASE_URL = "https://ollama.com/api/chat"

//     const formData = await request.formData()
//     const resourceTypesValue = formData.get("resourceTypes")

//     if (typeof resourceTypesValue !== "string") {
//         return new Response(JSON.stringify({ success: false, error: "resourceTypes mancante" }), {
//             status: 400,
//             headers: { "Content-Type": "application/json" },
//         })
//     }

//     let selectedTypes: string[]
//     try {
//         selectedTypes = JSON.parse(resourceTypesValue)
//     } catch {
//         return new Response(JSON.stringify({ success: false, error: "resourceTypes non valido" }), {
//             status: 400,
//             headers: { "Content-Type": "application/json" },
//         })
//     }

//     if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) {
//         return new Response(JSON.stringify({ success: false, error: "Nessun tipo di risorsa selezionato" }), {
//             status: 400,
//             headers: { "Content-Type": "application/json" },
//         })
//     }

//     const encoder = new TextEncoder()

//     const stream = new ReadableStream({
//         async start(controller) {
//             let completed = 0
//             let failed = 0
//             let skipped = 0
//             let processed = 0
//             const errors: { resourceId: string; type: string; error: string }[] = []

//             const send = (event: Record<string, unknown>) => {
//                 controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
//             }

//             try {
//                 // Prima recuperiamo tutte le risorse: così conosciamo il totale
//                 // e possiamo mostrare una percentuale reale nel frontend.
//                 const resources: {
//                     resourceId: string
//                     resourceType: string
//                     translatableContent: {
//                         key: string
//                         value: string
//                         digest: string
//                         locale: string
//                     }[]
//                 }[] = []

//                 send({ event: "discovery_start", total: 0, discovered: 0 })

//                 for (let typeIndex = 0; typeIndex < selectedTypes.length; typeIndex++) {
//                     const resourceType = selectedTypes[typeIndex]

//                     send({
//                         event: "type_start",
//                         resourceType,
//                         typeIndex: typeIndex + 1,
//                         typeCount: selectedTypes.length,
//                         phase: "discovery",
//                     })

//                     let cursor: string | null = null
//                     let hasNextPage = true

//                     while (hasNextPage) {
//                         const response = await admin.graphql(GET_TRANSLATABLE_RESOURCES, {
//                             variables: { type: resourceType, after: cursor },
//                         })

//                         const json = await response.json() as any

//                         if (json.errors?.length) {
//                             throw new Error(json.errors.map((e: any) => e.message).join("; "))
//                         }

//                         const data = json.data?.translatableResources

//                         if (!data) {
//                             throw new Error(
//                                 `Shopify non ha restituito translatableResources per ${resourceType}`
//                             )
//                         }

//                         for (const { node } of data.edges ?? []) {
//                             resources.push({
//                                 resourceId: node.resourceId,
//                                 resourceType,
//                                 translatableContent: node.translatableContent ?? [],
//                             })
//                         }

//                         send({
//                             event: "discovery_progress",
//                             discovered: resources.length,
//                             total: resources.length,
//                             resourceType,
//                             typeIndex: typeIndex + 1,
//                             typeCount: selectedTypes.length,
//                         })

//                         hasNextPage = data.pageInfo?.hasNextPage ?? false
//                         cursor = data.pageInfo?.endCursor ?? null

//                         if (hasNextPage) await sleep(300)
//                     }
//                 }

//                 const total = resources.length

//                 send({ event: "discovery_done", total, discovered: total })

//                 if (total === 0) {
//                     send({
//                         event: "done",
//                         completed: 0,
//                         failed: 0,
//                         skipped: 0,
//                         processed: 0,
//                         total: 0,
//                         errors: [],
//                     })
//                     controller.close()
//                     return
//                 }

//                 // Ora traduciamo una risorsa alla volta e inviamo un evento SSE
//                 // dopo ogni risorsa completata, saltata o fallita.
//                 let lastType = ""

//                 for (const resource of resources) {
//                     const { resourceId, resourceType, translatableContent } = resource

//                     if (resourceType !== lastType) {
//                         lastType = resourceType

//                         send({
//                             event: "type_start",
//                             resourceType,
//                             phase: "translation",
//                             typeIndex: selectedTypes.indexOf(resourceType) + 1,
//                             typeCount: selectedTypes.length,
//                             total,
//                         })
//                     }

//                     const fieldsToTranslate = translatableContent.filter(
//                         (f) => f.value && f.value.trim() !== "" && f.locale !== "en"
//                     )

//                     if (fieldsToTranslate.length === 0) {
//                         skipped++
//                         processed++

//                         send({
//                             event: "progress",
//                             resourceId,
//                             resourceType,
//                             completed,
//                             failed,
//                             skipped,
//                             processed,
//                             total,
//                             percent: Math.round((processed / total) * 100),
//                             status: "skipped",
//                         })

//                         continue
//                     }

//                     try {
//                         const translated = await translateWithOllama(
//                             fieldsToTranslate,
//                             OLLAMA_BASE_URL,
//                             OLLAMA_API_KEY
//                         )

//                         const regResponse = await admin.graphql(REGISTER_TRANSLATIONS, {
//                             variables: {
//                                 resourceId,
//                                 translations: translated.map((t, i) => ({
//                                     locale: "en",
//                                     key: fieldsToTranslate[i].key,
//                                     value: t.translated,
//                                     translatableContentDigest: fieldsToTranslate[i].digest,
//                                 })),
//                             },
//                         })

//                         const regJson = await regResponse.json() as any

//                         if (regJson.errors?.length) {
//                             throw new Error(
//                                 regJson.errors.map((e: any) => e.message).join("; ")
//                             )
//                         }

//                         const userErrors = regJson.data?.translationsRegister?.userErrors ?? []

//                         if (userErrors.length > 0) {
//                             throw new Error(
//                                 userErrors.map((e: any) => e.message).join("; ")
//                             )
//                         }

//                         completed++
//                         processed++

//                         send({
//                             event: "progress",
//                             resourceId,
//                             resourceType,
//                             completed,
//                             failed,
//                             skipped,
//                             processed,
//                             total,
//                             percent: Math.round((processed / total) * 100),
//                             status: "completed",
//                         })
//                     } catch (err: any) {
//                         failed++
//                         processed++

//                         const errorMessage = err?.message || "Errore durante la traduzione"

//                         console.error(`Errore su risorsa ${resourceId}:`, errorMessage)

//                         errors.push({
//                             resourceId,
//                             type: resourceType,
//                             error: errorMessage,
//                         })

//                         send({
//                             event: "error",
//                             resourceId,
//                             resourceType,
//                             completed,
//                             failed,
//                             skipped,
//                             processed,
//                             total,
//                             percent: Math.round((processed / total) * 100),
//                             error: errorMessage,
//                         })
//                     }

//                     await sleep(200)
//                 }

//                 send({
//                     event: "done",
//                     completed,
//                     failed,
//                     skipped,
//                     processed,
//                     total,
//                     errors,
//                 })

//                 controller.close()
//             } catch (err: any) {
//                 const errorMessage = err?.message || "Errore durante la traduzione"

//                 console.error("Errore fatale traduzione:", errorMessage)

//                 send({
//                     event: "fatal_error",
//                     error: errorMessage,
//                     completed,
//                     failed,
//                     skipped,
//                     processed,
//                     total: 0,
//                 })

//                 controller.close()
//             }
//         },
//     })

//     return new Response(stream, {
//         headers: {
//             "Content-Type": "text/event-stream; charset=utf-8",
//             "Cache-Control": "no-cache, no-transform",
//             "Connection": "keep-alive",
//             "X-Accel-Buffering": "no",
//         },
//     })
// }


// import { useState } from "react"
// import {
//     Page, Card, Button, Checkbox, ProgressBar,
//     Banner, Text, BlockStack, InlineStack,
//     Badge, Divider, List,
// } from "@shopify/polaris"

// // Loader vuoto per autenticazione
// export async function loader({ context, request }: any) {
//     await shopify(context).authenticate.admin(request)
//     return null
// }

// export default function TranslatePage() {
//     const [selected, setSelected] = useState<string[]>([])
//     const [running, setRunning] = useState(false)
//     const [done, setDone] = useState(false)
//     const [completed, setCompleted] = useState(0)
//     const [failed, setFailed] = useState(0)
//     const [skipped, setSkipped] = useState(0)
//     const [processed, setProcessed] = useState(0)
//     const [total, setTotal] = useState(0)
//     const [percent, setPercent] = useState(0)
//     const [currentType, setCurrentType] = useState("")
//     const [errors, setErrors] = useState<any[]>([])
//     const [fatalError, setFatalError] = useState("")
//     const [phase, setPhase] = useState("")

//     function toggleType(value: string) {
//         setSelected(prev =>
//             prev.includes(value)
//                 ? prev.filter(v => v !== value)
//                 : [...prev, value]
//         )
//     }

//     function selectAll() {
//         setSelected(RESOURCE_TYPES.map(t => t.value))
//     }

//     function reset() {
//         setSelected([])
//         setRunning(false)
//         setDone(false)
//         setCompleted(0)
//         setFailed(0)
//         setSkipped(0)
//         setProcessed(0)
//         setTotal(0)
//         setPercent(0)
//         setCurrentType("")
//         setErrors([])
//         setFatalError("")
//         setPhase("")
//     }

//     function handleEvent(event: any) {
//         switch (event.event) {
//             case "discovery_start":
//                 setPhase("Analisi delle risorse Shopify...")
//                 setPercent(0)
//                 setTotal(0)
//                 break

//             case "discovery_progress":
//                 setPhase("Ricerca delle risorse...")
//                 setTotal(event.total ?? 0)
//                 break

//             case "discovery_done":
//                 setPhase("Preparazione della traduzione...")
//                 setTotal(event.total ?? 0)
//                 setPercent(0)
//                 break

//             case "type_start":
//                 setCurrentType(event.resourceType || "")
//                 setPhase(event.phase === "discovery" ? "Ricerca delle risorse..." : "Traduzione...")
//                 break

//             case "progress":
//                 setCompleted(event.completed ?? 0)
//                 setFailed(event.failed ?? 0)
//                 setSkipped(event.skipped ?? 0)
//                 setProcessed(event.processed ?? 0)
//                 setTotal(event.total ?? 0)
//                 setPercent(event.percent ?? 0)

//                 if (event.resourceType) setCurrentType(event.resourceType)
//                 break

//             case "error":
//                 setCompleted(event.completed ?? 0)
//                 setFailed(event.failed ?? 0)
//                 setSkipped(event.skipped ?? 0)
//                 setProcessed(event.processed ?? 0)
//                 setTotal(event.total ?? 0)
//                 setPercent(event.percent ?? 0)

//                 if (event.resourceType) setCurrentType(event.resourceType)

//                 setErrors(prev => [
//                     ...prev,
//                     {
//                         resourceId: event.resourceId,
//                         type: event.resourceType,
//                         error: event.error,
//                     },
//                 ])
//                 break

//             case "done":
//                 setCompleted(event.completed ?? 0)
//                 setFailed(event.failed ?? 0)
//                 setSkipped(event.skipped ?? 0)
//                 setProcessed(event.processed ?? 0)
//                 setTotal(event.total ?? 0)
//                 setPercent(100)
//                 setErrors(event.errors ?? [])
//                 setDone(true)
//                 setRunning(false)
//                 setCurrentType("")
//                 setPhase("")
//                 break

//             case "fatal_error":
//                 setCompleted(event.completed ?? 0)
//                 setFailed(event.failed ?? 0)
//                 setSkipped(event.skipped ?? 0)
//                 setProcessed(event.processed ?? 0)
//                 setFatalError(event.error || "Errore durante la traduzione")
//                 setDone(true)
//                 setRunning(false)
//                 setCurrentType("")
//                 setPhase("")
//                 break
//         }
//     }

//     async function handleStart() {
//         if (selected.length === 0 || running) return

//         setRunning(true)
//         setDone(false)
//         setCompleted(0)
//         setFailed(0)
//         setSkipped(0)
//         setProcessed(0)
//         setTotal(0)
//         setPercent(0)
//         setErrors([])
//         setFatalError("")
//         setCurrentType("")
//         setPhase("Connessione...")

//         const formData = new FormData()
//         formData.append("resourceTypes", JSON.stringify(selected))

//         try {
//             const response = await fetch(window.location.pathname, {
//                 method: "POST",
//                 body: formData,
//             })

//             if (!response.ok) {
//                 const text = await response.text()
//                 let message = `Errore HTTP ${response.status}`

//                 try {
//                     const json = JSON.parse(text)
//                     message = json.error || message
//                 } catch {
//                     if (text) message = text
//                 }

//                 throw new Error(message)
//             }

//             if (!response.body) {
//                 throw new Error("Il browser non ha ricevuto lo stream di traduzione")
//             }

//             const reader = response.body
//                 .pipeThrough(new TextDecoderStream())
//                 .getReader()

//             let buffer = ""

//             while (true) {
//                 const { done: streamDone, value } = await reader.read()
//                 if (streamDone) break

//                 buffer += value

//                 const lines = buffer.split("\n")
//                 buffer = lines.pop() || ""

//                 for (const line of lines) {
//                     const trimmed = line.trim()

//                     if (!trimmed || !trimmed.startsWith("data:")) continue

//                     try {
//                         const jsonString = trimmed.replace(/^data:\s*/, "")
//                         handleEvent(JSON.parse(jsonString))
//                     } catch (parseError) {
//                         console.error("Errore parsing evento SSE:", parseError, trimmed)
//                     }
//                 }
//             }

//             // Gestisce anche un eventuale ultimo evento rimasto nel buffer.
//             const lastLine = buffer.trim()

//             if (lastLine.startsWith("data:")) {
//                 try {
//                     const jsonString = lastLine.replace(/^data:\s*/, "")
//                     handleEvent(JSON.parse(jsonString))
//                 } catch (parseError) {
//                     console.error("Errore parsing ultimo evento SSE:", parseError)
//                 }
//             }
//         } catch (err: any) {
//             console.error("Errore traduzione:", err)
//             setFatalError(err?.message || "Errore durante la connessione alla traduzione")
//             setDone(true)
//         } finally {
//             setRunning(false)
//         }
//     }

//     return (
//         <Page title="Traduzione Negozio → Inglese">
//             <BlockStack gap="500">
//                 {!running && !done && (
//                     <Card>
//                         <BlockStack gap="400">
//                             <Text variant="headingMd" as="h2">
//                                 Seleziona cosa tradurre
//                             </Text>

//                             <InlineStack gap="400" wrap>
//                                 {RESOURCE_TYPES.map(type => (
//                                     <Checkbox
//                                         key={type.value}
//                                         label={type.label}
//                                         checked={selected.includes(type.value)}
//                                         onChange={() => toggleType(type.value)}
//                                     />
//                                 ))}
//                             </InlineStack>

//                             <Divider />

//                             <InlineStack gap="300">
//                                 <Button onClick={selectAll}>
//                                     Seleziona tutto
//                                 </Button>

//                                 <Button
//                                     variant="primary"
//                                     onClick={handleStart}
//                                     disabled={selected.length === 0}
//                                 >
//                                     Avvia traduzione ({selected.length} selezionati)
//                                 </Button>
//                             </InlineStack>
//                         </BlockStack>
//                     </Card>
//                 )}

//                 {(running || done) && (
//                     <Card>
//                         <BlockStack gap="400">
//                             <Text variant="headingMd" as="h2">
//                                 {done
//                                     ? fatalError
//                                         ? "Traduzione interrotta"
//                                         : "Traduzione completata"
//                                     : "Traduzione in corso..."}
//                             </Text>

//                             {phase && (
//                                 <Text as="p" tone="subdued">
//                                     {phase}
//                                 </Text>
//                             )}

//                             {currentType && (
//                                 <Text as="p" tone="subdued">
//                                     Tipo: <strong>{currentType}</strong>
//                                 </Text>
//                             )}

//                             <ProgressBar
//                                 progress={Math.max(0, Math.min(100, percent))}
//                                 size="large"
//                                 tone={fatalError ? "critical" : "success"}
//                             />

//                             <Text as="p">
//                                 <strong>{percent}%</strong>
//                                 {" — "}
//                                 {processed} / {total} risorse elaborate
//                             </Text>

//                             <InlineStack gap="400" wrap>
//                                 <Badge tone="success">✅ {completed} completate</Badge>

//                                 {failed > 0 && (
//                                     <Badge tone="warning">⚠️ {failed} errori</Badge>
//                                 )}

//                                 {skipped > 0 && (
//                                     <Badge>⏭️ {skipped} saltate</Badge>
//                                 )}
//                             </InlineStack>

//                             {done && !fatalError && (
//                                 <Banner tone="success">
//                                     Traduzione completata! {completed} risorse tradotte
//                                     {failed > 0 ? `, ${failed} errori` : ""}
//                                     {skipped > 0 ? `, ${skipped} saltate` : ""}.
//                                 </Banner>
//                             )}

//                             {fatalError && (
//                                 <Banner tone="critical">
//                                     Errore: {fatalError}
//                                 </Banner>
//                             )}

//                             {errors.length > 0 && (
//                                 <BlockStack gap="200">
//                                     <Text variant="headingSm" as="h3">
//                                         Dettaglio errori:
//                                     </Text>

//                                     <List type="bullet">
//                                         {errors.map((e, i) => (
//                                             <List.Item key={`${e.resourceId}-${i}`}>
//                                                 [{e.type}] {e.resourceId}: {e.error}
//                                             </List.Item>
//                                         ))}
//                                     </List>
//                                 </BlockStack>
//                             )}

//                             {done && (
//                                 <Button onClick={reset}>
//                                     Nuova traduzione
//                                 </Button>
//                             )}
//                         </BlockStack>
//                     </Card>
//                 )}
//             </BlockStack>
//         </Page>
//     )
// }




import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState } from "react";
import {
  Page,
  Card,
  Button,
  ProgressBar,
  Text,
  BlockStack,
  InlineStack,
  Checkbox,
  Banner,
  List,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

/**
 * ============================================================
 * CONFIG
 * ============================================================
 */

const OLLAMA_URL = "https://YOUR-OLLAMA-ENDPOINT/api/generate";
const OLLAMA_MODEL = "gpt-oss:120b";

const TARGET_LOCALE = "en";

/**
 * IMPORTANT:
 * Keep this reasonably low on Cloudflare Free.
 *
 * 8 resources can produce approximately:
 *   1 Shopify discovery query
 *   8 Ollama requests
 *   8 Shopify translationsRegister mutations
 *
 * = ~17 external subrequests, plus authentication/runtime overhead.
 */
const BATCH_SIZE = 8;

/**
 * Shopify Admin API 2026-01 valid resource types.
 */
export const RESOURCE_TYPES = [
  { label: "Prodotti", value: "PRODUCT" },
  { label: "Collezioni", value: "COLLECTION" },
  { label: "Pagine", value: "PAGE" },
  { label: "Articoli blog", value: "ARTICLE" },
  { label: "Menu", value: "MENU" },
  { label: "Metaobject", value: "METAOBJECT" },
  {
    label: "Tema",
    value: "ONLINE_STORE_THEME_LOCALE_CONTENT",
  },
  { label: "Notifiche", value: "EMAIL_TEMPLATE" },
  { label: "Metadati negozio", value: "SHOP" },
  { label: "Filtri", value: "FILTER" },
] as const;

const VALID_RESOURCE_TYPES = new Set(
  RESOURCE_TYPES.map((item) => item.value),
);

/**
 * ============================================================
 * GRAPHQL
 * ============================================================
 */

const GET_TRANSLATABLE_RESOURCES = `#graphql
query GetTranslatableResources(
  $type: TranslatableResourceType!
  $first: Int!
  $after: String
) {
  translatableResources(
    resourceType: $type
    first: $first
    after: $after
  ) {
    edges {
      cursor
      node {
        resourceId

        translatableContent {
          key
          value
          digest
          locale
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

const REGISTER_TRANSLATIONS = `#graphql
mutation RegisterTranslations(
  $resourceId: ID!
  $translations: [TranslationInput!]!
) {
  translationsRegister(
    resourceId: $resourceId
    translations: $translations
  ) {
    translations {
      key
      value
      locale
    }

    userErrors {
      field
      message
      code
    }
  }
}
`;

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type TranslatableContent = {
  key: string;
  value: string | null;
  digest: string;
  locale: string;
};

type ShopifyResource = {
  resourceId: string;
  translatableContent: TranslatableContent[];
};

type TranslationResult = {
  [key: string]: string;
};

type ShopifyUserError = {
  field?: string[];
  message: string;
  code?: string;
};

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts a translated handle into a Shopify-safe slug.
 *
 * Example:
 *
 * "Men's American Hip Hop Y2K Leather Jacket"
 *
 * becomes:
 *
 * "mens-american-hip-hop-y2k-leather-jacket"
 */
function normalizeHandle(value: string): string {
  let handle = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  handle = handle
    .replace(/['’"`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  /**
   * Shopify handles should not be gigantic.
   * Keep room for collision suffixes.
   */
  return handle.slice(0, 180);
}

/**
 * Makes a deterministic unique fallback.
 *
 * Example:
 *
 * mens-american-hip-hop-y2k-leather-jacket
 *
 * becomes:
 *
 * mens-american-hip-hop-y2k-leather-jacket-10456999067989
 */
function makeUniqueHandle(
  baseHandle: string,
  resourceId: string,
): string {
  const numericId =
    resourceId.match(/\d+$/)?.[0] ?? "resource";

  const suffix = `-${numericId}`;

  const maxBaseLength = 255 - suffix.length;

  return (
    baseHandle.slice(0, maxBaseLength).replace(/-+$/, "") +
    suffix
  );
}

/**
 * Parse JSON returned by Ollama even if the model wraps it
 * inside markdown/code fences.
 */
function parseOllamaJson(text: string): TranslationResult {
  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  /**
   * Try direct JSON first.
   */
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue below.
  }

  /**
   * Try to extract the first JSON object.
   */
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first !== -1 && last !== -1 && last > first) {
    const possibleJson = cleaned.slice(first, last + 1);

    return JSON.parse(possibleJson);
  }

  throw new Error(
    `Ollama did not return valid JSON: ${cleaned.slice(0, 500)}`,
  );
}

/**
 * ============================================================
 * OLLAMA
 * ============================================================
 */

async function translateWithOllama(
  content: TranslatableContent[],
): Promise<TranslationResult> {
  const fields = content.map((item) => ({
    key: item.key,
    value: item.value ?? "",
    locale: item.locale,
  }));

  const prompt = `
You are a professional Italian-to-English Shopify translator.

Translate the following Shopify translatable fields from Italian to English.

IMPORTANT RULES:

1. Translate EVERY field.
2. You MUST translate the "handle" field.
3. NEVER leave "handle" unchanged unless it is genuinely impossible.
4. The translated handle must be an English URL slug.
5. The handle must:
   - use lowercase
   - use ASCII characters
   - use hyphens
   - contain no spaces
   - contain no accents
   - contain no apostrophes
   - contain no quotes
   - contain no special characters
6. Do NOT translate HTML structure.
7. Preserve HTML tags and attributes.
8. Preserve URLs unless they are clearly part of translatable text.
9. Return ONLY valid JSON.
10. Do NOT return markdown.
11. Do NOT add explanations.
12. The JSON keys MUST exactly match the original keys.

Example:

Input:
{
  "title": "Giacca Pelle Uomo Hip Hop Americano Y2K",
  "handle": "giacca-pelle-uomo-hip-hop-americano-y2k"
}

Output:
{
  "title": "Men's American Hip Hop Y2K Leather Jacket",
  "handle": "mens-american-hip-hop-y2k-leather-jacket"
}

SOURCE FIELDS:
${JSON.stringify(fields, null, 2)}
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama HTTP ${response.status}: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    response?: string;
  };

  if (!data.response) {
    throw new Error("Ollama returned an empty response");
  }

  const result = parseOllamaJson(data.response);

  /**
   * FORCE HANDLE TRANSLATION.
   *
   * Even if Ollama returns the original handle, we regenerate
   * a slug from the translated handle/title.
   */
  if ("handle" in result) {
    result.handle = normalizeHandle(result.handle);
  }

  /**
   * If Ollama failed to return a handle but title exists,
   * generate the handle from the translated title.
   */
  if (
    !result.handle &&
    typeof result.title === "string" &&
    result.title.trim()
  ) {
    result.handle = normalizeHandle(result.title);
  }

  return result;
}

/**
 * ============================================================
 * SSE
 * ============================================================
 */

function createSSEStream(
  handler: (
    send: (
      event: string,
      data: Record<string, unknown>,
    ) => void,
  ) => Promise<void>,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (
        event: string,
        data: Record<string, unknown>,
      ) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      try {
        await handler(send);
      } catch (error) {
        send("fatal_error", {
          message:
            error instanceof Error
              ? error.message
              : String(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * ============================================================
 * SHOPIFY TRANSLATION
 * ============================================================
 */

async function registerTranslations(
  admin: any,
  resource: ShopifyResource,
  translated: TranslationResult,
): Promise<{
  success: boolean;
  handleUsed?: string;
  error?: string;
}> {
  const translations = resource.translatableContent
    .filter((item) => item.value !== null)
    .map((item) => {
      let value = translated[item.key];

      /**
       * If Ollama didn't return a field, keep original value
       * for non-handle fields.
       */
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        value = item.value ?? "";
      }

      /**
       * ======================================================
       * FORCE HANDLE TRANSLATION
       * ======================================================
       */
      if (item.key === "handle") {
        value = normalizeHandle(value);

        /**
         * Absolute fallback:
         * if Ollama somehow returned an empty handle,
         * derive it from the translated title.
         */
        if (!value) {
          const translatedTitle =
            translated.title ??
            resource.translatableContent.find(
              (x) => x.key === "title",
            )?.value ??
            "translated-resource";

          value = normalizeHandle(translatedTitle);
        }
      }

      return {
        locale: TARGET_LOCALE,
        key: item.key,
        value,
        translatableContentDigest: item.digest,
      };
    });

  /**
   * Make sure HANDLE is present.
   *
   * Some Shopify resources may not expose it.
   */
  const hasHandle = translations.some(
    (item) => item.key === "handle",
  );

  if (!hasHandle) {
    /**
     * There is no handle field for this resource.
     * That's fine for resources such as some metaobjects.
     */
  }

  /**
   * ----------------------------------------------------------
   * FIRST ATTEMPT
   * ----------------------------------------------------------
   */
  const response = await admin.graphql(
    REGISTER_TRANSLATIONS,
    {
      variables: {
        resourceId: resource.resourceId,
        translations,
      },
    },
  );

  const json = await response.json();

  const payload =
    json?.data?.translationsRegister;

  const userErrors: ShopifyUserError[] =
    payload?.userErrors ?? [];

  if (!userErrors.length) {
    return {
      success: true,
      handleUsed:
        translations.find(
          (item) => item.key === "handle",
        )?.value,
    };
  }

  /**
   * ----------------------------------------------------------
   * HANDLE COLLISION
   * ----------------------------------------------------------
   *
   * Shopify specifically reports:
   *
   * INVALID_VALUE_FOR_HANDLE_TRANSLATION
   *
   * or:
   *
   * "is already taken as a handle for this resource"
   *
   * In that case we DO NOT skip the handle.
   *
   * We generate a unique fallback and retry.
   */
  const handleError = userErrors.some(
    (error) =>
      error.code ===
        "INVALID_VALUE_FOR_HANDLE_TRANSLATION" ||
      error.message
        .toLowerCase()
        .includes("already taken as a handle"),
  );

  if (!handleError) {
    return {
      success: false,
      error: userErrors
        .map((error) => error.message)
        .join("; "),
    };
  }

  const handleIndex = translations.findIndex(
    (item) => item.key === "handle",
  );

  if (handleIndex === -1) {
    return {
      success: false,
      error: userErrors
        .map((error) => error.message)
        .join("; "),
    };
  }

  const originalHandle =
    translations[handleIndex].value;

  const uniqueHandle = makeUniqueHandle(
    originalHandle,
    resource.resourceId,
  );

  translations[handleIndex] = {
    ...translations[handleIndex],
    value: uniqueHandle,
  };

  /**
   * ----------------------------------------------------------
   * SECOND ATTEMPT
   * ----------------------------------------------------------
   */
  const retryResponse = await admin.graphql(
    REGISTER_TRANSLATIONS,
    {
      variables: {
        resourceId: resource.resourceId,
        translations,
      },
    },
  );

  const retryJson = await retryResponse.json();

  const retryPayload =
    retryJson?.data?.translationsRegister;

  const retryErrors: ShopifyUserError[] =
    retryPayload?.userErrors ?? [];

  if (retryErrors.length) {
    return {
      success: false,
      error: retryErrors
        .map((error) => error.message)
        .join("; "),
    };
  }

  return {
    success: true,
    handleUsed: uniqueHandle,
  };
}

/**
 * ============================================================
 * ACTION
 * ============================================================
 */

export async function action({
  request,
}: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();

  const selectedTypesRaw =
    String(
      formData.get("resourceTypes") ?? "",
    );

  const selectedTypes =
    selectedTypesRaw
      .split(",")
      .map((value) => value.trim())
      .filter(
        (value) =>
          value &&
          VALID_RESOURCE_TYPES.has(value as any),
      );

  /**
   * Batch state.
   */
  let resourceTypeIndex = Number(
    formData.get("resourceTypeIndex") ?? 0,
  );

  let cursor =
    String(formData.get("cursor") ?? "") ||
    null;

  let completedTotal = Number(
    formData.get("completedTotal") ?? 0,
  );

  let failedTotal = Number(
    formData.get("failedTotal") ?? 0,
  );

  let skippedTotal = Number(
    formData.get("skippedTotal") ?? 0,
  );

  let processedTotal = Number(
    formData.get("processedTotal") ?? 0,
  );

  /**
   * If nothing selected, finish immediately.
   */
  if (!selectedTypes.length) {
    return createSSEStream(async (send) => {
      send("done", {
        completed: 0,
        failed: 0,
        skipped: 0,
        processed: 0,
      });
    });
  }

  return createSSEStream(async (send) => {
    if (
      resourceTypeIndex >=
      selectedTypes.length
    ) {
      send("done", {
        completed: completedTotal,
        failed: failedTotal,
        skipped: skippedTotal,
        processed: processedTotal,
      });

      return;
    }

    const resourceType =
      selectedTypes[resourceTypeIndex];

    send("batch_start", {
      resourceType,
      resourceTypeIndex,
      resourceTypeCount: selectedTypes.length,
      batchSize: BATCH_SIZE,
    });

    /**
     * --------------------------------------------------------
     * GET ONLY ONE SHOPIFY PAGE
     * --------------------------------------------------------
     */
    const response = await admin.graphql(
      GET_TRANSLATABLE_RESOURCES,
      {
        variables: {
          type: resourceType,
          first: BATCH_SIZE,
          after: cursor,
        },
      },
    );

    const json = await response.json();

    if (json.errors?.length) {
      throw new Error(
        json.errors
          .map((error: any) => error.message)
          .join("; "),
      );
    }

    const connection =
      json?.data?.translatableResources;

    if (!connection) {
      throw new Error(
        `Shopify did not return translatableResources for ${resourceType}`,
      );
    }

    const resources: ShopifyResource[] =
      (connection.edges ?? []).map(
        (edge: any) => edge.node,
      );

    /**
     * Empty page.
     *
     * Move to next resource type.
     */
    if (!resources.length) {
      resourceTypeIndex++;
      cursor = null;

      if (
        resourceTypeIndex >=
        selectedTypes.length
      ) {
        send("done", {
          completed: completedTotal,
          failed: failedTotal,
          skipped: skippedTotal,
          processed: processedTotal,
        });

        return;
      }

      send("batch_done", {
        nextResourceTypeIndex:
          resourceTypeIndex,
        nextCursor: null,
        hasMore: true,

        completedTotal,
        failedTotal,
        skippedTotal,
        processedTotal,
      });

      return;
    }

    /**
     * --------------------------------------------------------
     * PROCESS BATCH
     * --------------------------------------------------------
     */
    let batchProcessed = 0;

    for (const resource of resources) {
      try {
        /**
         * Get translatable fields.
         */
        const content =
          resource.translatableContent ?? [];

        if (!content.length) {
          skippedTotal++;
          processedTotal++;
          batchProcessed++;

          send("progress", {
            resourceId: resource.resourceId,
            resourceType,

            status: "skipped",

            batchProcessed,
            batchSize: resources.length,

            completedTotal,
            failedTotal,
            skippedTotal,
            processedTotal,
          });

          continue;
        }

        /**
         * ----------------------------------------------------
         * OLLAMA
         * ----------------------------------------------------
         */
        const translated =
          await translateWithOllama(content);

        /**
         * ----------------------------------------------------
         * SHOPIFY
         *
         * HANDLE IS INCLUDED HERE.
         * ----------------------------------------------------
         */
        const result =
          await registerTranslations(
            admin,
            resource,
            translated,
          );

        if (!result.success) {
          failedTotal++;
          processedTotal++;
          batchProcessed++;

          send("progress", {
            resourceId: resource.resourceId,
            resourceType,

            status: "failed",

            error: result.error,

            batchProcessed,
            batchSize: resources.length,

            completedTotal,
            failedTotal,
            skippedTotal,
            processedTotal,
          });

          continue;
        }

        completedTotal++;
        processedTotal++;
        batchProcessed++;

        send("progress", {
          resourceId: resource.resourceId,
          resourceType,

          status: "completed",

          /**
           * Show which handle Shopify received.
           */
          handle:
            result.handleUsed ?? null,

          batchProcessed,
          batchSize: resources.length,

          completedTotal,
          failedTotal,
          skippedTotal,
          processedTotal,
        });
      } catch (error) {
        failedTotal++;
        processedTotal++;
        batchProcessed++;

        send("progress", {
          resourceId: resource.resourceId,
          resourceType,

          status: "failed",

          error:
            error instanceof Error
              ? error.message
              : String(error),

          batchProcessed,
          batchSize: resources.length,

          completedTotal,
          failedTotal,
          skippedTotal,
          processedTotal,
        });
      }

      /**
       * Small delay between resources.
       */
      await sleep(100);
    }

    /**
     * --------------------------------------------------------
     * CONTINUE PAGINATION
     * --------------------------------------------------------
     */
    const hasNextPage =
      connection.pageInfo?.hasNextPage ?? false;

    const nextCursor =
      connection.pageInfo?.endCursor ?? null;

    if (hasNextPage) {
      /**
       * Same resource type,
       * next Shopify page.
       */
      send("batch_done", {
        nextResourceTypeIndex:
          resourceTypeIndex,

        nextCursor,

        hasMore: true,

        completedTotal,
        failedTotal,
        skippedTotal,
        processedTotal,
      });

      return;
    }

    /**
     * --------------------------------------------------------
     * CURRENT RESOURCE TYPE FINISHED
     * --------------------------------------------------------
     */
    const nextResourceTypeIndex =
      resourceTypeIndex + 1;

    if (
      nextResourceTypeIndex >=
      selectedTypes.length
    ) {
      send("done", {
        completed: completedTotal,
        failed: failedTotal,
        skipped: skippedTotal,
        processed: processedTotal,
      });

      return;
    }

    send("batch_done", {
      nextResourceTypeIndex,
      nextCursor: null,
      hasMore: true,

      completedTotal,
      failedTotal,
      skippedTotal,
      processedTotal,
    });
  });
}

/**
 * ============================================================
 * FRONTEND
 * ============================================================
 */

export default function TranslationPage() {
  const [selectedTypes, setSelectedTypes] =
    useState<string[]>(["PRODUCT"]);

  const [running, setRunning] =
    useState(false);

  const [completed, setCompleted] =
    useState(0);

  const [failed, setFailed] =
    useState(0);

  const [skipped, setSkipped] =
    useState(0);

  const [processed, setProcessed] =
    useState(0);

  const [batchProcessed, setBatchProcessed] =
    useState(0);

  const [batchSize, setBatchSize] =
    useState(BATCH_SIZE);

  const [resourceType, setResourceType] =
    useState("");

  const [errors, setErrors] =
    useState<string[]>([]);

  const [lastHandle, setLastHandle] =
    useState("");

  /**
   * ----------------------------------------------------------
   * READ ONE SSE RESPONSE
   * ----------------------------------------------------------
   */
  async function consumeSSE(
    response: Response,
  ): Promise<{
    done: boolean;
    nextResourceTypeIndex?: number;
    nextCursor?: string | null;
  }> {
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    if (!response.body) {
      throw new Error(
        "SSE response body is empty",
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    let result = {
      done: false,
      nextResourceTypeIndex:
        undefined as number | undefined,
      nextCursor:
        undefined as string | null | undefined,
    };

    while (true) {
      const { value, done } =
        await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true,
      });

      const events =
        buffer.split("\n\n");

      buffer =
        events.pop() ?? "";

      for (const eventBlock of events) {
        const lines =
          eventBlock.split("\n");

        let eventName = "message";
        let dataLine = "";

        for (const line of lines) {
          if (
            line.startsWith("event:")
          ) {
            eventName =
              line.slice(6).trim();
          }

          if (
            line.startsWith("data:")
          ) {
            dataLine +=
              line.slice(5).trim();
          }
        }

        if (!dataLine) continue;

        let data: any;

        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }

        /**
         * ----------------------------------------------------
         * PROGRESS
         * ----------------------------------------------------
         */
        if (eventName === "progress") {
          setResourceType(
            data.resourceType ?? "",
          );

          setBatchProcessed(
            data.batchProcessed ?? 0,
          );

          setBatchSize(
            data.batchSize ?? BATCH_SIZE,
          );

          setCompleted(
            data.completedTotal ?? 0,
          );

          setFailed(
            data.failedTotal ?? 0,
          );

          setSkipped(
            data.skippedTotal ?? 0,
          );

          setProcessed(
            data.processedTotal ?? 0,
          );

          if (data.error) {
            setErrors((previous) => [
              ...previous,
              `${data.resourceId}: ${data.error}`,
            ]);
          }

          /**
           * Display translated handle.
           */
          if (data.handle) {
            setLastHandle(data.handle);
          }
        }

        /**
         * ----------------------------------------------------
         * NEXT BATCH
         * ----------------------------------------------------
         */
        if (
          eventName === "batch_done"
        ) {
          result.nextResourceTypeIndex =
            data.nextResourceTypeIndex;

          result.nextCursor =
            data.nextCursor ?? null;

          setCompleted(
            data.completedTotal ?? 0,
          );

          setFailed(
            data.failedTotal ?? 0,
          );

          setSkipped(
            data.skippedTotal ?? 0,
          );

          setProcessed(
            data.processedTotal ?? 0,
          );
        }

        /**
         * ----------------------------------------------------
         * DONE
         * ----------------------------------------------------
         */
        if (eventName === "done") {
          result.done = true;

          setCompleted(
            data.completed ?? 0,
          );

          setFailed(
            data.failed ?? 0,
          );

          setSkipped(
            data.skipped ?? 0,
          );

          setProcessed(
            data.processed ?? 0,
          );
        }

        /**
         * ----------------------------------------------------
         * FATAL ERROR
         * ----------------------------------------------------
         */
        if (
          eventName === "fatal_error"
        ) {
          throw new Error(
            data.message ??
              "Unknown server error",
          );
        }
      }
    }

    return result;
  }

  /**
   * ----------------------------------------------------------
   * START TRANSLATION
   * ----------------------------------------------------------
   */
 async function startTranslation() {
  if (!selectedTypes.length) {
    return;
  }

  setRunning(true);
  setCompleted(0);
  setFailed(0);
  setSkipped(0);
  setProcessed(0);
  setBatchProcessed(0);
  setErrors([]);
  setLastHandle("");

  let resourceTypeIndex = 0;
  let cursor: string | null = null;

  let completedTotal = 0;
  let failedTotal = 0;
  let skippedTotal = 0;
  let processedTotal = 0;

  try {
    while (true) {
      const formData = new FormData();

      formData.set(
        "resourceTypes",
        selectedTypes.join(","),
      );

      formData.set(
        "resourceTypeIndex",
        String(resourceTypeIndex),
      );

      if (cursor) {
        formData.set("cursor", cursor);
      }

      formData.set(
        "completedTotal",
        String(completedTotal),
      );

      formData.set(
        "failedTotal",
        String(failedTotal),
      );

      formData.set(
        "skippedTotal",
        String(skippedTotal),
      );

      formData.set(
        "processedTotal",
        String(processedTotal),
      );

      const response = await fetch(
        window.location.pathname,
        {
          method: "POST",
          body: formData,
        },
      );

      const result =
        await consumeSSE(response);

      const state =
        (window as any)
          .__translationBatchState;

      if (state) {
        completedTotal =
          state.completedTotal;

        failedTotal =
          state.failedTotal;

        skippedTotal =
          state.skippedTotal;

        processedTotal =
          state.processedTotal;
      }

      if (result.done) {
        break;
      }

      resourceTypeIndex =
        result.nextResourceTypeIndex ?? 0;

      cursor =
        result.nextCursor ?? null;
    }
  } catch (error) {
    setErrors((previous) => [
      ...previous,
      error instanceof Error
        ? error.message
        : String(error),
    ]);
  } finally {
    setRunning(false);
  }
}
  /**
   * Percentage of current batch.
   *
   * The total number of resources is not known in advance,
   * so this represents current-batch progress rather than
   * pretending to know the final global percentage.
   */
  const progress =
    batchSize > 0
      ? Math.min(
          100,
          Math.round(
            (batchProcessed /
              batchSize) *
              100,
          ),
        )
      : 0;

  return (
    <Page title="Traduzione IT → EN">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text
              as="h2"
              variant="headingMd"
            >
              Risorse da tradurre
            </Text>

            {RESOURCE_TYPES.map(
              (resource) => (
                <Checkbox
                  key={resource.value}
                  label={resource.label}
                  checked={selectedTypes.includes(
                    resource.value,
                  )}
                  disabled={running}
                  onChange={(checked) => {
                    setSelectedTypes(
                      (previous) =>
                        checked
                          ? [
                              ...previous,
                              resource.value,
                            ]
                          : previous.filter(
                              (item) =>
                                item !==
                                resource.value,
                            ),
                    );
                  }}
                />
              ),
            )}

            <Button
              variant="primary"
              loading={running}
              disabled={
                running ||
                selectedTypes.length === 0
              }
              onClick={
                startTranslation
              }
            >
              Avvia traduzione
            </Button>
          </BlockStack>
        </Card>

        {running && (
          <Card>
            <BlockStack gap="400">
              <Text
                as="h2"
                variant="headingMd"
              >
                Traduzione in corso…
              </Text>

              {resourceType && (
                <Text as="p">
                  Tipo:{" "}
                  <strong>
                    {resourceType}
                  </strong>
                </Text>
              )}

              <ProgressBar
                progress={progress}
              />

              <Text as="p">
                Batch:{" "}
                {batchProcessed} /{" "}
                {batchSize}
              </Text>

              <Text as="p">
                Risorse elaborate:{" "}
                {processed}
              </Text>

              <InlineStack gap="400">
                <Text as="p">
                  ✅ Completate:{" "}
                  {completed}
                </Text>

                <Text as="p">
                  ❌ Errori: {failed}
                </Text>

                <Text as="p">
                  ⏭ Saltate: {skipped}
                </Text>
              </InlineStack>

              {lastHandle && (
                <Banner tone="success">
                  Handle tradotto:
                  <br />
                  <strong>
                    {lastHandle}
                  </strong>
                </Banner>
              )}
            </BlockStack>
          </Card>
        )}

        {!running &&
          processed > 0 && (
            <Banner
              tone={
                failed > 0
                  ? "warning"
                  : "success"
              }
            >
              Traduzione terminata.
              <br />
              Completate: {completed}
              <br />
              Errori: {failed}
              <br />
              Saltate: {skipped}
            </Banner>
          )}

        {errors.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text
                as="h2"
                variant="headingMd"
              >
                Errori
              </Text>

              <List>
                {errors.map(
                  (error, index) => (
                    <List.Item
                      key={`${index}-${error}`}
                    >
                      {error}
                    </List.Item>
                  ),
                )}
              </List>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
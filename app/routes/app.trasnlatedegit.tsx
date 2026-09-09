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




import { type ActionFunctionArgs } from "@remix-run/cloudflare"
import { shopify } from "../shopify.server"
import { useState } from "react"
import {
    Page,
    Card,
    Button,
    Checkbox,
    ProgressBar,
    Banner,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    Divider,
    List,
} from "@shopify/polaris"

/**
 * Cloudflare Workers has a per-invocation subrequest limit.
 * Keep the batch deliberately small:
 *   1 Shopify query + (BATCH_SIZE x Ollama) + (BATCH_SIZE x translationsRegister)
 * With 10 resources this is normally 21 external requests per invocation.
 */
export const BATCH_SIZE = 10

export const RESOURCE_TYPES = [
    { label: "Prodotti", value: "PRODUCT" },
    { label: "Collezioni", value: "COLLECTION" },
    { label: "Pagine", value: "PAGE" },
    { label: "Articoli blog", value: "ARTICLE" },
    { label: "Menu", value: "MENU" },
    { label: "Metaobject", value: "METAOBJECT" },
    { label: "Tema", value: "ONLINE_STORE_THEME_LOCALE_CONTENT" },
    { label: "Notifiche", value: "EMAIL_TEMPLATE" },
    { label: "Metadati negozio", value: "SHOP" },
    { label: "Filtri", value: "FILTER" },
]

const VALID_RESOURCE_TYPES = new Set(RESOURCE_TYPES.map((item) => item.value))

export const GET_TRANSLATABLE_RESOURCES = `#graphql
  query getTranslatableResources($type: TranslatableResourceType!, $after: String, $first: Int!) {
    translatableResources(resourceType: $type, first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
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
    }
  }
`

export const REGISTER_TRANSLATIONS = `#graphql
  mutation registerTranslations($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      translations { locale key value }
      userErrors { field message }
    }
  }
`

type TranslatableField = {
    key: string
    value: string
    digest: string
    locale: string
}

type ResourceNode = {
    resourceId: string
    resourceType: string
    translatableContent: TranslatableField[]
}

type TranslationError = {
    resourceId: string
    type: string
    error: string
}

type ProgressState = {
    completed: number
    failed: number
    skipped: number
    processed: number
    errors: TranslationError[]
}

function parseInteger(value: FormDataEntryValue | null, fallback = 0) {
    if (typeof value !== "string") return fallback
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseErrors(value: FormDataEntryValue | null): TranslationError[] {
    if (typeof value !== "string" || !value) return []

    try {
        const parsed = JSON.parse(value)
        if (!Array.isArray(parsed)) return []
        return parsed.slice(-100) as TranslationError[]
    } catch {
        return []
    }
}

function jsonError(message: string, status = 400) {
    return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
    })
}

export async function translateWithOllama(
    fields: { key: string; value: string }[],
    ollamaUrl: string,
    apiKey: string
): Promise<{ key: string; translated: string }[]> {
    const input = Object.fromEntries(fields.map((field) => [field.key, field.value]))

    const res = await fetch(ollamaUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-oss:120b",
            messages: [
                {
                    role: "system",
                    content: `
You are a professional e-commerce translator.
Translate all values from Italian to English.
Preserve HTML tags exactly as they are.
Do not translate JSON keys.
Return ONLY valid JSON with the same keys as input.
          `.trim(),
                },
                {
                    role: "user",
                    content: JSON.stringify(input),
                },
            ],
            stream: false,
            format: "json",
        }),
    })

    const raw = await res.text()

    if (!res.ok) {
        throw new Error(`Ollama error ${res.status}: ${raw.slice(0, 500)}`)
    }

    let data: any
    try {
        data = JSON.parse(raw)
    } catch {
        throw new Error(`Ollama ha restituito JSON non valido: ${raw.slice(0, 500)}`)
    }

    if (!data.message?.content) {
        throw new Error("Ollama returned empty content")
    }

    let translated: Record<string, unknown>
    try {
        translated = JSON.parse(data.message.content)
    } catch {
        throw new Error("Ollama ha restituito un contenuto di traduzione non valido")
    }

    return fields.map((field) => ({
        key: field.key,
        translated:
            typeof translated[field.key] === "string"
                ? translated[field.key] as string
                : field.value,
    }))
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function action({ context, request }: ActionFunctionArgs) {
    const { admin } = await shopify(context).authenticate.admin(request)
    const { OLLAMA_API_KEY } = context.cloudflare.env
    const OLLAMA_BASE_URL = "https://ollama.com/api/chat"

    const formData = await request.formData()
    const resourceTypesValue = formData.get("resourceTypes")

    if (typeof resourceTypesValue !== "string") {
        return jsonError("resourceTypes mancante")
    }

    let selectedTypes: string[]
    try {
        selectedTypes = JSON.parse(resourceTypesValue)
    } catch {
        return jsonError("resourceTypes non valido")
    }

    if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) {
        return jsonError("Nessun tipo di risorsa selezionato")
    }

    selectedTypes = selectedTypes.filter(
        (type): type is string => typeof type === "string" && VALID_RESOURCE_TYPES.has(type)
    )

    if (selectedTypes.length === 0) {
        return jsonError("I tipi di risorsa selezionati non sono validi per Shopify Admin API 2026-01")
    }

    const typeIndex = parseInteger(formData.get("typeIndex"), 0)
    const cursorValue = formData.get("cursor")
    const cursor = typeof cursorValue === "string" && cursorValue ? cursorValue : null

    if (typeIndex >= selectedTypes.length) {
        return jsonError("typeIndex non valido")
    }

    const progress: ProgressState = {
        completed: parseInteger(formData.get("completed")),
        failed: parseInteger(formData.get("failed")),
        skipped: parseInteger(formData.get("skipped")),
        processed: parseInteger(formData.get("processed")),
        errors: parseErrors(formData.get("errors")),
    }

    const resourceType = selectedTypes[typeIndex]
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false

            const send = (event: Record<string, unknown>) => {
                if (closed) return
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
                } catch {
                    closed = true
                }
            }

            const finish = () => {
                if (closed) return
                closed = true
                try {
                    controller.close()
                } catch {
                    // Stream già chiuso dal runtime.
                }
            }

            try {
                send({
                    event: "batch_start",
                    resourceType,
                    typeIndex: typeIndex + 1,
                    typeCount: selectedTypes.length,
                    cursor,
                    batchSize: BATCH_SIZE,
                    processed: progress.processed,
                    completed: progress.completed,
                    failed: progress.failed,
                    skipped: progress.skipped,
                })

                const response = await admin.graphql(GET_TRANSLATABLE_RESOURCES, {
                    variables: {
                        type: resourceType,
                        first: BATCH_SIZE,
                        after: cursor,
                    },
                })

                const json = await response.json() as any

                if (json.errors?.length) {
                    throw new Error(json.errors.map((error: any) => error.message).join("; "))
                }

                const data = json.data?.translatableResources

                if (!data) {
                    throw new Error(
                        `Shopify non ha restituito translatableResources per ${resourceType}`
                    )
                }

                const resources: ResourceNode[] = (data.edges ?? [])
                    .map((edge: any) => edge?.node)
                    .filter(Boolean)
                    .map((node: any) => ({
                        resourceId: node.resourceId,
                        resourceType,
                        translatableContent: node.translatableContent ?? [],
                    }))

                send({
                    event: "batch_loaded",
                    resourceType,
                    batchTotal: resources.length,
                    hasNextPage: Boolean(data.pageInfo?.hasNextPage),
                    nextCursor: data.pageInfo?.endCursor ?? null,
                    processed: progress.processed,
                    completed: progress.completed,
                    failed: progress.failed,
                    skipped: progress.skipped,
                })

                if (resources.length === 0) {
                    const nextTypeIndex = typeIndex + 1
                    const hasNextType = nextTypeIndex < selectedTypes.length

                    if (hasNextType) {
                        send({
                            event: "type_done",
                            resourceType,
                            typeIndex: typeIndex + 1,
                            typeCount: selectedTypes.length,
                            nextTypeIndex,
                            nextCursor: null,
                        })
                    } else {
                        send({
                            event: "done",
                            completed: progress.completed,
                            failed: progress.failed,
                            skipped: progress.skipped,
                            processed: progress.processed,
                            errors: progress.errors,
                        })
                    }

                    finish()
                    return
                }

                for (let index = 0; index < resources.length; index++) {
                    const resource = resources[index]
                    const batchProcessed = index + 1
                    const batchPercent = Math.round((batchProcessed / resources.length) * 100)

                    send({
                        event: "resource_start",
                        resourceId: resource.resourceId,
                        resourceType,
                        batchIndex: batchProcessed,
                        batchTotal: resources.length,
                        batchPercent,
                        processed: progress.processed,
                        completed: progress.completed,
                        failed: progress.failed,
                        skipped: progress.skipped,
                    })

                    const fieldsToTranslate = resource.translatableContent.filter(
                        (field) =>
                            typeof field.value === "string" &&
                            field.value.trim() !== "" &&
                            field.locale !== "en"
                    )

                    if (fieldsToTranslate.length === 0) {
                        progress.skipped++
                        progress.processed++

                        send({
                            event: "progress",
                            resourceId: resource.resourceId,
                            resourceType,
                            completed: progress.completed,
                            failed: progress.failed,
                            skipped: progress.skipped,
                            processed: progress.processed,
                            batchIndex: batchProcessed,
                            batchTotal: resources.length,
                            batchPercent,
                            status: "skipped",
                        })

                        continue
                    }

                    try {
                        const translated = await translateWithOllama(
                            fieldsToTranslate.map((field) => ({
                                key: field.key,
                                value: field.value,
                            })),
                            OLLAMA_BASE_URL,
                            OLLAMA_API_KEY
                        )

                        const translations = translated.map((translation, translationIndex) => ({
                            locale: "en",
                            key: fieldsToTranslate[translationIndex].key,
                            value: translation.translated,
                            translatableContentDigest: fieldsToTranslate[translationIndex].digest,
                        }))

                        const regResponse = await admin.graphql(REGISTER_TRANSLATIONS, {
                            variables: {
                                resourceId: resource.resourceId,
                                translations,
                            },
                        })

                        const regJson = await regResponse.json() as any

                        if (regJson.errors?.length) {
                            throw new Error(
                                regJson.errors.map((error: any) => error.message).join("; ")
                            )
                        }

                        const userErrors = regJson.data?.translationsRegister?.userErrors ?? []

                        if (userErrors.length > 0) {
                            throw new Error(
                                userErrors.map((error: any) => error.message).join("; ")
                            )
                        }

                        progress.completed++
                        progress.processed++

                        send({
                            event: "progress",
                            resourceId: resource.resourceId,
                            resourceType,
                            completed: progress.completed,
                            failed: progress.failed,
                            skipped: progress.skipped,
                            processed: progress.processed,
                            batchIndex: batchProcessed,
                            batchTotal: resources.length,
                            batchPercent,
                            status: "completed",
                        })
                    } catch (error: any) {
                        progress.failed++
                        progress.processed++

                        const errorMessage = error?.message || "Errore durante la traduzione"

                        console.error(
                            `Errore su risorsa ${resource.resourceId}:`,
                            errorMessage
                        )

                        progress.errors.push({
                            resourceId: resource.resourceId,
                            type: resourceType,
                            error: errorMessage,
                        })

                        // Manteniamo al massimo gli ultimi 100 errori da passare al batch successivo.
                        progress.errors = progress.errors.slice(-100)

                        send({
                            event: "error",
                            resourceId: resource.resourceId,
                            resourceType,
                            completed: progress.completed,
                            failed: progress.failed,
                            skipped: progress.skipped,
                            processed: progress.processed,
                            batchIndex: batchProcessed,
                            batchTotal: resources.length,
                            batchPercent,
                            error: errorMessage,
                        })
                    }

                    // Piccola pausa per non martellare Ollama/Shopify.
                    await sleep(150)
                }

                const hasNextPage = Boolean(data.pageInfo?.hasNextPage)
                const nextCursor = data.pageInfo?.endCursor ?? null

                if (hasNextPage && !nextCursor) {
                    throw new Error("Shopify ha indicato hasNextPage=true ma non ha restituito endCursor")
                }

                if (hasNextPage) {
                    send({
                        event: "batch_done",
                        resourceType,
                        typeIndex: typeIndex + 1,
                        typeCount: selectedTypes.length,
                        hasNextPage: true,
                        nextTypeIndex: typeIndex,
                        nextCursor,
                        completed: progress.completed,
                        failed: progress.failed,
                        skipped: progress.skipped,
                        processed: progress.processed,
                        errors: progress.errors,
                    })
                } else {
                    const nextTypeIndex = typeIndex + 1
                    const hasNextType = nextTypeIndex < selectedTypes.length

                    if (hasNextType) {
                        send({
                            event: "type_done",
                            resourceType,
                            typeIndex: typeIndex + 1,
                            typeCount: selectedTypes.length,
                            nextTypeIndex,
                            nextCursor: null,
                            completed: progress.completed,
                            failed: progress.failed,
                            skipped: progress.skipped,
                            processed: progress.processed,
                            errors: progress.errors,
                        })
                    } else {
                        send({
                            event: "done",
                            completed: progress.completed,
                            failed: progress.failed,
                            skipped: progress.skipped,
                            processed: progress.processed,
                            errors: progress.errors,
                        })
                    }
                }

                finish()
            } catch (error: any) {
                const errorMessage = error?.message || "Errore durante la traduzione"

                console.error("Errore batch traduzione:", errorMessage)

                send({
                    event: "fatal_error",
                    error: errorMessage,
                    resourceType,
                    typeIndex: typeIndex + 1,
                    typeCount: selectedTypes.length,
                    completed: progress.completed,
                    failed: progress.failed,
                    skipped: progress.skipped,
                    processed: progress.processed,
                    errors: progress.errors,
                })

                finish()
            }
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    })
}

export async function loader({ context, request }: any) {
    await shopify(context).authenticate.admin(request)
    return null
}

export default function TranslatePage() {
    const [selected, setSelected] = useState<string[]>([])
    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [completed, setCompleted] = useState(0)
    const [failed, setFailed] = useState(0)
    const [skipped, setSkipped] = useState(0)
    const [processed, setProcessed] = useState(0)
    const [batchIndex, setBatchIndex] = useState(0)
    const [batchTotal, setBatchTotal] = useState(BATCH_SIZE)
    const [batchPercent, setBatchPercent] = useState(0)
    const [currentType, setCurrentType] = useState("")
    const [currentTypeIndex, setCurrentTypeIndex] = useState(0)
    const [typeCount, setTypeCount] = useState(0)
    const [errors, setErrors] = useState<any[]>([])
    const [fatalError, setFatalError] = useState("")
    const [phase, setPhase] = useState("")

    function toggleType(value: string) {
        setSelected((prev) =>
            prev.includes(value)
                ? prev.filter((item) => item !== value)
                : [...prev, value]
        )
    }

    function selectAll() {
        setSelected(RESOURCE_TYPES.map((type) => type.value))
    }

    function reset() {
        setSelected([])
        setRunning(false)
        setDone(false)
        setCompleted(0)
        setFailed(0)
        setSkipped(0)
        setProcessed(0)
        setBatchIndex(0)
        setBatchTotal(BATCH_SIZE)
        setBatchPercent(0)
        setCurrentType("")
        setCurrentTypeIndex(0)
        setTypeCount(0)
        setErrors([])
        setFatalError("")
        setPhase("")
    }

    function applyCounters(event: any) {
        setCompleted(event.completed ?? 0)
        setFailed(event.failed ?? 0)
        setSkipped(event.skipped ?? 0)
        setProcessed(event.processed ?? 0)
        if (Array.isArray(event.errors)) setErrors(event.errors)
    }

    function handleEvent(event: any) {
        switch (event.event) {
            case "batch_start":
                setPhase("Caricamento batch...")
                setCurrentType(event.resourceType || "")
                setCurrentTypeIndex(event.typeIndex ?? 0)
                setTypeCount(event.typeCount ?? 0)
                applyCounters(event)
                break

            case "batch_loaded":
                setPhase("Traduzione batch...")
                setBatchTotal(event.batchTotal ?? BATCH_SIZE)
                setBatchPercent(0)
                setCurrentType(event.resourceType || "")
                break

            case "resource_start":
                setPhase(`Traduzione risorsa ${event.batchIndex ?? 0}/${event.batchTotal ?? 0}...`)
                setBatchIndex(event.batchIndex ?? 0)
                setBatchTotal(event.batchTotal ?? BATCH_SIZE)
                setBatchPercent(event.batchPercent ?? 0)
                setCurrentType(event.resourceType || "")
                break

            case "progress":
                applyCounters(event)
                setBatchIndex(event.batchIndex ?? 0)
                setBatchTotal(event.batchTotal ?? BATCH_SIZE)
                setBatchPercent(event.batchPercent ?? 0)
                setCurrentType(event.resourceType || "")
                setPhase(
                    event.status === "skipped"
                        ? "Risorsa saltata..."
                        : "Traduzione in corso..."
                )
                break

            case "error":
                applyCounters(event)
                setBatchIndex(event.batchIndex ?? 0)
                setBatchTotal(event.batchTotal ?? BATCH_SIZE)
                setBatchPercent(event.batchPercent ?? 0)
                setCurrentType(event.resourceType || "")
                setPhase("Batch in corso — errore su una risorsa")
                setErrors((previous) => {
                    const next = [
                        ...previous,
                        {
                            resourceId: event.resourceId,
                            type: event.resourceType,
                            error: event.error,
                        },
                    ]
                    return next.slice(-100)
                })
                break

            case "batch_done":
                applyCounters(event)
                setBatchPercent(100)
                setPhase("Batch completato — continuo con il prossimo...")
                break

            case "type_done":
                applyCounters(event)
                setBatchPercent(100)
                setPhase("Tipo completato — continuo con il prossimo...")
                break

            case "done":
                applyCounters(event)
                setBatchPercent(100)
                setDone(true)
                setRunning(false)
                setCurrentType("")
                setPhase("")
                break

            case "fatal_error":
                applyCounters(event)
                setFatalError(event.error || "Errore durante la traduzione")
                setDone(true)
                setRunning(false)
                setCurrentType(event.resourceType || "")
                setPhase("")
                break
        }
    }

    async function runBatch(
        resourceTypes: string[],
        typeIndex: number,
        cursor: string | null,
        state: ProgressState
    ): Promise<void> {
        const formData = new FormData()
        formData.append("resourceTypes", JSON.stringify(resourceTypes))
        formData.append("typeIndex", String(typeIndex))
        formData.append("cursor", cursor || "")
        formData.append("completed", String(state.completed))
        formData.append("failed", String(state.failed))
        formData.append("skipped", String(state.skipped))
        formData.append("processed", String(state.processed))
        formData.append("errors", JSON.stringify(state.errors.slice(-100)))

        const response = await fetch(window.location.pathname, {
            method: "POST",
            body: formData,
        })

        if (!response.ok) {
            const text = await response.text()
            let message = `Errore HTTP ${response.status}`

            try {
                const json = JSON.parse(text)
                message = json.error || message
            } catch {
                if (text) message = text
            }

            throw new Error(message)
        }

        if (!response.body) {
            throw new Error("Il browser non ha ricevuto lo stream SSE")
        }

        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader()

        let buffer = ""
        let nextAction: {
            typeIndex: number
            cursor: string | null
            state: ProgressState
        } | null = null
        let streamFatalError = ""
        let streamDone = false

        const processLine = (line: string) => {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data:")) return

            const jsonString = trimmed.replace(/^data:\s*/, "")
            const event = JSON.parse(jsonString)
            handleEvent(event)

            if (event.event === "batch_done") {
                nextAction = {
                    typeIndex: event.nextTypeIndex ?? typeIndex,
                    cursor: event.nextCursor ?? null,
                    state: {
                        completed: event.completed ?? 0,
                        failed: event.failed ?? 0,
                        skipped: event.skipped ?? 0,
                        processed: event.processed ?? 0,
                        errors: Array.isArray(event.errors) ? event.errors : [],
                    },
                }
            }

            if (event.event === "type_done") {
                nextAction = {
                    typeIndex: event.nextTypeIndex,
                    cursor: null,
                    state: {
                        completed: event.completed ?? 0,
                        failed: event.failed ?? 0,
                        skipped: event.skipped ?? 0,
                        processed: event.processed ?? 0,
                        errors: Array.isArray(event.errors) ? event.errors : [],
                    },
                }
            }

            if (event.event === "done") {
                streamDone = true
            }

            if (event.event === "fatal_error") {
                streamFatalError = event.error || "Errore durante la traduzione"
            }
        }

        try {
            while (true) {
                const { done: readerDone, value } = await reader.read()
                if (readerDone) break

                buffer += value
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        processLine(line)
                    } catch (error) {
                        console.error("Errore parsing SSE:", error, line)
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    processLine(buffer)
                } catch (error) {
                    console.error("Errore parsing ultimo evento SSE:", error, buffer)
                }
            }
        } finally {
            reader.releaseLock()
        }

        if (streamFatalError) {
            throw new Error(streamFatalError)
        }

        if (streamDone) return

        if (!nextAction) {
            throw new Error("Il batch è terminato senza indicare il prossimo cursor o la fine della traduzione")
        }

        // Yield to the browser/event loop between Worker invocations.
        await sleep(50)
        return runBatch(
            resourceTypes,
            nextAction.typeIndex,
            nextAction.cursor,
            nextAction.state
        )
    }

    async function handleStart() {
        if (selected.length === 0 || running) return

        setRunning(true)
        setDone(false)
        setCompleted(0)
        setFailed(0)
        setSkipped(0)
        setProcessed(0)
        setBatchIndex(0)
        setBatchTotal(BATCH_SIZE)
        setBatchPercent(0)
        setCurrentType("")
        setCurrentTypeIndex(0)
        setTypeCount(selected.length)
        setErrors([])
        setFatalError("")
        setPhase("Avvio traduzione a batch...")

        try {
            await runBatch(selected, 0, null, {
                completed: 0,
                failed: 0,
                skipped: 0,
                processed: 0,
                errors: [],
            })
        } catch (error: any) {
            console.error("Errore traduzione:", error)
            setFatalError(error?.message || "Errore durante la connessione alla traduzione")
            setDone(true)
        } finally {
            setRunning(false)
        }
    }

    return (
        <Page title="Traduzione Negozio → Inglese">
            <BlockStack gap="500">
                {!running && !done && (
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                Seleziona cosa tradurre
                            </Text>

                            <InlineStack gap="400" wrap>
                                {RESOURCE_TYPES.map((type) => (
                                    <Checkbox
                                        key={type.value}
                                        label={type.label}
                                        checked={selected.includes(type.value)}
                                        onChange={() => toggleType(type.value)}
                                    />
                                ))}
                            </InlineStack>

                            <Divider />

                            <Text as="p" tone="subdued">
                                La traduzione viene eseguita in batch da {BATCH_SIZE} risorse per invocation,
                                per evitare il limite di subrequest di Cloudflare Workers.
                            </Text>

                            <InlineStack gap="300">
                                <Button onClick={selectAll}>Seleziona tutto</Button>

                                <Button
                                    variant="primary"
                                    onClick={handleStart}
                                    disabled={selected.length === 0}
                                >
                                    Avvia traduzione ({selected.length} selezionati)
                                </Button>
                            </InlineStack>
                        </BlockStack>
                    </Card>
                )}

                {(running || done) && (
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                {done
                                    ? fatalError
                                        ? "Traduzione interrotta"
                                        : "Traduzione completata"
                                    : "Traduzione in corso..."}
                            </Text>

                            {phase && (
                                <Text as="p" tone="subdued">
                                    {phase}
                                </Text>
                            )}

                            {currentType && (
                                <Text as="p" tone="subdued">
                                    Tipo: <strong>{currentType}</strong>
                                    {typeCount > 0 ? ` (${currentTypeIndex}/${typeCount})` : ""}
                                </Text>
                            )}

                            <ProgressBar
                                progress={Math.max(0, Math.min(100, batchPercent))}
                                size="large"
                                tone={fatalError ? "critical" : "success"}
                            />

                            <Text as="p">
                                <strong>{batchPercent}% batch</strong>
                                {" — "}
                                {batchIndex} / {batchTotal} risorse nel batch
                                {" — "}
                                {processed} risorse elaborate complessivamente
                            </Text>

                            <InlineStack gap="400" wrap>
                                <Badge tone="success">✅ {completed} completate</Badge>

                                {failed > 0 && (
                                    <Badge tone="warning">⚠️ {failed} errori</Badge>
                                )}

                                {skipped > 0 && (
                                    <Badge>⏭️ {skipped} saltate</Badge>
                                )}
                            </InlineStack>

                            {!done && (
                                <Banner tone="info">
                                    Il progresso è calcolato per batch. Ogni batch apre una nuova invocation
                                    Cloudflare, evitando il limite "Too many subrequests".
                                </Banner>
                            )}

                            {done && !fatalError && (
                                <Banner tone="success">
                                    Traduzione completata! {completed} risorse tradotte
                                    {failed > 0 ? `, ${failed} errori` : ""}
                                    {skipped > 0 ? `, ${skipped} saltate` : ""}.
                                </Banner>
                            )}

                            {fatalError && (
                                <Banner tone="critical">Errore: {fatalError}</Banner>
                            )}

                            {errors.length > 0 && (
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">
                                        Dettaglio errori:
                                    </Text>

                                    <List type="bullet">
                                        {errors.map((error, index) => (
                                            <List.Item key={`${error.resourceId}-${index}`}>
                                                [{error.type}] {error.resourceId}: {error.error}
                                            </List.Item>
                                        ))}
                                    </List>
                                </BlockStack>
                            )}

                            {done && (
                                <Button onClick={reset}>Nuova traduzione</Button>
                            )}
                        </BlockStack>
                    </Card>
                )}
            </BlockStack>
        </Page>
    )
}

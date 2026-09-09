

import {  type ActionFunctionArgs } from "@remix-run/cloudflare"
import { shopify } from "../shopify.server"

export const RESOURCE_TYPES = [
    { label: "Prodotti", value: "PRODUCT" },
    { label: "Varianti", value: "PRODUCT_VARIANT" },
    { label: "Collezioni", value: "COLLECTION" },
    { label: "Pagine", value: "ONLINE_STORE_PAGE" },
    { label: "Articoli blog", value: "ONLINE_STORE_ARTICLE" },
    { label: "Menu", value: "ONLINE_STORE_MENU" },
    { label: "Metaobject", value: "METAOBJECT" },
    { label: "Tema", value: "ONLINE_STORE_THEME_LOCALE_CONTENT" },
    { label: "Notifiche", value: "EMAIL_TEMPLATE" },
    { label: "Metadati negozio", value: "SHOP" },
    { label: "Filtri", value: "FILTER" },
]

export const GET_TRANSLATABLE_RESOURCES = `#graphql
  query getTranslatableResources($type: TranslatableResourceType!, $after: String) {
    translatableResources(resourceType: $type, first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
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



export async function translateWithOllama(
    fields: { key: string; value: string }[],
    ollamaUrl: string,
    apiKey: string
): Promise<{ key: string; translated: string }[]> {
    const input = Object.fromEntries(fields.map(f => [f.key, f.value]))

    const res = await fetch(`${ollamaUrl}`, {
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

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    const data = await res.json()
    if (!data.message?.content) throw new Error("Ollama returned empty content")

    const translated = JSON.parse(data.message.content)
    return fields.map(f => ({
        key: f.key,
        translated: translated[f.key] ?? f.value,
    }))
}

export function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms))
}





// export async function action({ context, request }: ActionFunctionArgs) {
//     const { admin } = await shopify(context).authenticate.admin(request)
//     const { OLLAMA_API_KEY } = context.cloudflare.env
//     let OLLAMA_BASE_URL = "https://ollama.com/api/chat"
//     const formData = await request.formData()
//     const selectedTypes: string[] = JSON.parse(
//         formData.get("resourceTypes") as string
//     )

//     // SSE stream
//     const encoder = new TextEncoder()
//     const stream = new ReadableStream({
//         async start(controller) {
//             function send(data: object) {
//                 controller.enqueue(
//                     encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
//                 )
//             }

//             let completed = 0
//             let failed = 0
//             const errors: { resourceId: string; type: string; error: string }[] = []

//             try {
//                 for (const resourceType of selectedTypes) {
//                     send({ event: "type_start", resourceType })

//                     let cursor: string | null = null
//                     let hasNextPage = true

//                     while (hasNextPage) {
//                         // const json = await shopifyGraphQL(
//                         //   session.shop,
//                         //   session.accessToken!,
//                         //   GET_TRANSLATABLE_RESOURCES,
//                         //   { type: resourceType, after: cursor }
//                         // )
//                         const json = await admin.graphql(GET_TRANSLATABLE_RESOURCES, { variables: { type: resourceType, after: cursor } })
//                         const { edges, pageInfo } = json.data.translatableResources

//                         for (const { node } of edges) {
//                             const { resourceId, translatableContent } = node

//                             const fieldsToTranslate = translatableContent.filter(
//                                 (f: any) => f.value?.trim() && f.locale !== "en"
//                             )

//                             if (fieldsToTranslate.length === 0) {
//                                 send({ event: "skipped", resourceId, resourceType })
//                                 continue
//                             }

//                             try {
//                                 // Traduci con Ollama
//                                 const translated = await translateWithOllama(
//                                     fieldsToTranslate,
//                                     OLLAMA_BASE_URL,
//                                     OLLAMA_API_KEY
//                                 )

//                                 // Salva su Shopify
//                                 const result = await admin.graphql(

//                                     REGISTER_TRANSLATIONS,
//                                     {
//                                         variables: {
//                                             resourceId,
//                                             translations: translated.map((t, i) => ({
//                                                 locale: "en",
//                                                 key: fieldsToTranslate[i].key,
//                                                 value: t.translated,
//                                                 translatableContentDigest: fieldsToTranslate[i].digest,
//                                             })),
//                                         }

//                                     }
//                                 )

//                                 const userErrors =
//                                     result.data?.translationsRegister?.userErrors ?? []

//                                 if (userErrors.length > 0) {
//                                     throw new Error(JSON.stringify(userErrors))
//                                 }

//                                 completed++
//                                 send({ event: "progress", completed, failed, resourceId, resourceType })

//                             } catch (err: any) {
//                                 failed++
//                                 errors.push({ resourceId, type: resourceType, error: err.message })
//                                 send({ event: "error", resourceId, resourceType, error: err.message, completed, failed })
//                             }

//                             // Rate limit protection
//                             await sleep(200)
//                         }

//                         hasNextPage = pageInfo.hasNextPage
//                         cursor = pageInfo.endCursor

//                         if (hasNextPage) await sleep(300)
//                     }

//                     send({ event: "type_done", resourceType })
//                 }

//                 // Fine
//                 send({ event: "done", completed, failed, errors })

//             } catch (err: any) {
//                 send({ event: "fatal_error", error: err.message })
//             } finally {
//                 controller.close()
//             }
//         },
//     })

//     return new Response(stream, {
//         headers: {
//             "Content-Type": "text/event-stream",
//             "Cache-Control": "no-cache",
//             Connection: "keep-alive",
//         },
//     })
// }

export async function action({ context, request }: ActionFunctionArgs) {
    const { admin } = await shopify(context).authenticate.admin(request)
    const { OLLAMA_API_KEY } = context.cloudflare.env
    const OLLAMA_BASE_URL = "https://ollama.com/api/chat"
    
    const formData = await request.formData()
    const selectedTypes: string[] = JSON.parse(
        formData.get("resourceTypes") as string
    )
console.log("data is her",selectedTypes)
    let completed = 0
    let failed = 0
    let skipped = 0
    const errors: { resourceId: string; type: string; error: string }[] = []

    try {
        for (const resourceType of selectedTypes) {
            let cursor: string | null = null
            let hasNextPage = true

            while (hasNextPage) {
                const response = await admin.graphql(GET_TRANSLATABLE_RESOURCES, { 
                    variables: { type: resourceType, after: cursor } 
                })
                
                const json = await response.json()
                const { edges, pageInfo } = json.data.translatableResources

                for (const { node } of edges) {
                    const { resourceId, translatableContent } = node

                    const fieldsToTranslate = translatableContent.filter(
                        (f: any) => f.value?.trim() && f.locale !== "en"
                    )

                    if (fieldsToTranslate.length === 0) {
                        skipped++
                        continue
                    }

                    try {
                        // Translate with Ollama
                        const translated = await translateWithOllama(
                            fieldsToTranslate,
                            OLLAMA_BASE_URL,
                            OLLAMA_API_KEY
                        )

                        // Register translations on Shopify
                        const regResponse = await admin.graphql(REGISTER_TRANSLATIONS, {
                            variables: {
                                resourceId,
                                translations: translated.map((t: any, i: number) => ({
                                    locale: "en",
                                    key: fieldsToTranslate[i].key,
                                    value: t.translated,
                                    translatableContentDigest: fieldsToTranslate[i].digest,
                                })),
                            }
                        })

                        const regJson = await regResponse.json()
                        const userErrors = regJson.data?.translationsRegister?.userErrors ?? []

                        if (userErrors.length > 0) {
                            throw new Error(JSON.stringify(userErrors))
                        }

                        completed++
                    } catch (err: any) {
                        failed++
                        errors.push({ 
                            resourceId, 
                            type: resourceType, 
                            error: err.message || "Translation failed" 
                        })
                    }

                    // Rate limiting delay
                    await sleep(200)
                }

                hasNextPage = pageInfo.hasNextPage
                cursor = pageInfo.endCursor

                if (hasNextPage) await sleep(300)
            }
        }

        return Response.json({
            success: true,
            completed,
            failed,
            skipped,
            errors,
        })

    } catch (err: any) {
        return Response.json(
            { success: false, error: err.message },
            { status: 500 }
        )
    }
}







import { useState, useRef } from "react"
import {
    Page, Card, Button, Checkbox, ProgressBar,
    Banner, Text, BlockStack, InlineStack,
    Badge, Divider, List,
} from "@shopify/polaris"

// Loader vuoto per autenticazione
export async function loader({ context, request }: any) {
    await shopify(context).authenticate.admin(request)
    return null
}

// ─── UI ───────────────────────────────────────────────────
// export default function TranslatePage() {
//     const [selected, setSelected] = useState<string[]>([])
//     const [running, setRunning] = useState(false)
//     const [done, setDone] = useState(false)
//     const [completed, setCompleted] = useState(0)
//     const [failed, setFailed] = useState(0)
//     const [currentType, setCurrentType] = useState("")
//     const [errors, setErrors] = useState<any[]>([])
//     const [fatalError, setFatalError] = useState("")
//     const readerRef = useRef<ReadableStreamDefaultReader | null>(null)

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
//         setCurrentType("")
//         setErrors([])
//         setFatalError("")
//     }

//     async function handleStart() {
//         if (selected.length === 0) return

//         setRunning(true)
//         setDone(false)
//         setCompleted(0)
//         setFailed(0)
//         setErrors([])
//         setFatalError("")

//         const formData = new FormData()
//         formData.append("resourceTypes", JSON.stringify(selected))

//         const response = await fetch("/app/trasnlatedegit", {
//             method: "POST",
//             body: formData,
//         })

//         if (!response.body) {
//             setFatalError("Stream non disponibile")
//             setRunning(false)
//             return
//         }

//         const reader = response.body
//             .pipeThrough(new TextDecoderStream())
//             .getReader()

//         readerRef.current = reader as any

//         while (true) {
//             const { done: streamDone, value } = await reader.read()
//             if (streamDone) break

//             // Parsa eventi SSE
//             const lines = value.split("\n").filter(l => l.startsWith("data:"))
//             for (const line of lines) {
//                 try {
//                     const event = JSON.parse(line.replace("data: ", ""))
//                     handleEvent(event)
//                 } catch { }
//             }
//         }

//         setRunning(false)
//     }

//     function handleEvent(event: any) {
//         switch (event.event) {
//             case "type_start":
//                 setCurrentType(event.resourceType)
//                 break
//             case "progress":
//                 setCompleted(event.completed)
//                 setFailed(event.failed)
//                 break
//             case "error":
//                 setCompleted(event.completed)
//                 setFailed(event.failed)
//                 setErrors(prev => [...prev, event])
//                 break
//             case "done":
//                 setCompleted(event.completed)
//                 setFailed(event.failed)
//                 setErrors(event.errors)
//                 setDone(true)
//                 setCurrentType("")
//                 break
//             case "fatal_error":
//                 setFatalError(event.error)
//                 setDone(true)
//                 break
//         }
//     }

//     const total = completed + failed
//     const percent = total > 0 ? Math.min(100, Math.round((total / total) * 100)) : 0

//     return (
//         <Page title="Traduzione Negozio → Inglese">
//             <BlockStack gap="500">

//                 {/* Selezione */}
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

//                 {/* Progress in tempo reale */}
//                 {(running || done) && (
//                     <Card>
//                         <BlockStack gap="400">
//                             <Text variant="headingMd" as="h2">
//                                 {done ? "Traduzione completata" : "Traduzione in corso..."}
//                             </Text>

//                             {running && currentType && (
//                                 <Text as="p" tone="subdued">
//                                     Elaborazione: <strong>{currentType}</strong>
//                                 </Text>
//                             )}

//                             <ProgressBar
//                                 progress={done ? 100 : Math.min(99, (completed + failed) * 2)}
//                                 size="large"
//                                 tone={fatalError ? "critical" : "success"}
//                             />

//                             <InlineStack gap="400">
//                                 <Badge tone="success">✅ {completed} completati</Badge>
//                                 {failed > 0 && (
//                                     <Badge tone="warning">⚠️ {failed} errori</Badge>
//                                 )}
//                             </InlineStack>

//                             {/* Completato */}
//                             {done && !fatalError && (
//                                 <Banner tone="success">
//                                     Traduzione completata! {completed} risorse tradotte
//                                     {failed > 0 ? `, ${failed} errori` : ""}.
//                                 </Banner>
//                             )}

//                             {/* Errore fatale */}
//                             {fatalError && (
//                                 <Banner tone="critical">
//                                     Errore: {fatalError}
//                                 </Banner>
//                             )}

//                             {/* Lista errori */}
//                             {errors.length > 0 && (
//                                 <BlockStack gap="200">
//                                     <Text variant="headingSm" as="h3">
//                                         Dettaglio errori:
//                                     </Text>
//                                     <List type="bullet">
//                                         {errors.map((e, i) => (
//                                             <List.Item key={i}>
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


export default function TranslatePage() {
    const [selected, setSelected] = useState<string[]>([])
    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [completed, setCompleted] = useState(0)
    const [failed, setFailed] = useState(0)
    const [currentType, setCurrentType] = useState("")
    const [errors, setErrors] = useState<any[]>([])
    const [fatalError, setFatalError] = useState("")
    const readerRef = useRef<ReadableStreamDefaultReader | null>(null)

    function toggleType(value: string) {
        setSelected(prev =>
            prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev, value]
        )
    }

    function selectAll() {
        setSelected(RESOURCE_TYPES.map(t => t.value))
    }

    function reset() {
        setSelected([])
        setRunning(false)
        setDone(false)
        setCompleted(0)
        setFailed(0)
        setCurrentType("")
        setErrors([])
        setFatalError("")
    }

    async function handleStart() {
        if (selected.length === 0) return

        setRunning(true)
        setDone(false)
        setCompleted(0)
        setFailed(0)
        setErrors([])
        setFatalError("")

        const formData = new FormData()
        formData.append("resourceTypes", JSON.stringify(selected))

        try {
            // FIX: Target the current route URL instead of hardcoded '/api/translate-stream'
            const response = await fetch(window.location.pathname, {
                method: "POST",
                body: formData,
            })

            if (!response.body) {
                setFatalError("Stream non disponibile")
                setRunning(false)
                return
            }

            const reader = response.body
                .pipeThrough(new TextDecoderStream())
                .getReader()

            readerRef.current = reader as any

            let buffer = ""

            while (true) {
                const { done: streamDone, value } = await reader.read()
                if (streamDone) break

                // Safe line buffering for SSE stream
                buffer += value
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed.startsWith("data:")) {
                        try {
                            const jsonString = trimmed.replace(/^data:\s*/, "")
                            const event = JSON.parse(jsonString)
                            handleEvent(event)
                        } catch (e) {
                            console.error("Errore di parsing SSE:", e)
                        }
                    }
                }
            }
        } catch (err: any) {
            setFatalError(err.message || "Errore durante la connessione allo stream")
        } finally {
            setRunning(false)
        }
    }

    function handleEvent(event: any) {
        switch (event.event) {
            case "type_start":
                setCurrentType(event.resourceType)
                break
            case "progress":
                setCompleted(event.completed)
                setFailed(event.failed)
                break
            case "error":
                setCompleted(event.completed)
                setFailed(event.failed)
                setErrors(prev => [...prev, event])
                break
            case "done":
                setCompleted(event.completed)
                setFailed(event.failed)
                setErrors(event.errors)
                setDone(true)
                setCurrentType("")
                break
            case "fatal_error":
                setFatalError(event.error)
                setDone(true)
                break
        }
    }

    return (
        <Page title="Traduzione Negozio → Inglese">
            <BlockStack gap="500">

                {/* Selezione */}
                {!running && !done && (
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                Seleziona cosa tradurre
                            </Text>

                            <InlineStack gap="400" wrap>
                                {RESOURCE_TYPES.map(type => (
                                    <Checkbox
                                        key={type.value}
                                        label={type.label}
                                        checked={selected.includes(type.value)}
                                        onChange={() => toggleType(type.value)}
                                    />
                                ))}
                            </InlineStack>

                            <Divider />

                            <InlineStack gap="300">
                                <Button onClick={selectAll}>
                                    Seleziona tutto
                                </Button>
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

                {/* Progress in tempo reale */}
                {(running || done) && (
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">
                                {done ? "Traduzione completata" : "Traduzione in corso..."}
                            </Text>

                            {running && currentType && (
                                <Text as="p" tone="subdued">
                                    Elaborazione: <strong>{currentType}</strong>
                                </Text>
                            )}

                            <ProgressBar
                                progress={done ? 100 : Math.min(99, (completed + failed) * 2)}
                                size="large"
                                tone={fatalError ? "critical" : "success"}
                            />

                            <InlineStack gap="400">
                                <Badge tone="success">✅ {completed} completati</Badge>
                                {failed > 0 && (
                                    <Badge tone="warning">⚠️ {failed} errori</Badge>
                                )}
                            </InlineStack>

                            {/* Completato */}
                            {done && !fatalError && (
                                <Banner tone="success">
                                    Traduzione completata! {completed} risorse tradotte
                                    {failed > 0 ? `, ${failed} errori` : ""}.
                                </Banner>
                            )}

                            {/* Errore fatale */}
                            {fatalError && (
                                <Banner tone="critical">
                                    Errore: {fatalError}
                                </Banner>
                            )}

                            {/* Lista errori */}
                            {errors.length > 0 && (
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">
                                        Dettaglio errori:
                                    </Text>
                                    <List type="bullet">
                                        {errors.map((e, i) => (
                                            <List.Item key={i}>
                                                [{e.type}] {e.resourceId}: {e.error}
                                            </List.Item>
                                        ))}
                                    </List>
                                </BlockStack>
                            )}

                            {done && (
                                <Button onClick={reset}>
                                    Nuova traduzione
                                </Button>
                            )}
                        </BlockStack>
                    </Card>
                )}

            </BlockStack>
        </Page>
    )
}
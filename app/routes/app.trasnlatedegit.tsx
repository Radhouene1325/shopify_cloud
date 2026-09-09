import {  type ActionFunctionArgs } from "@remix-run/cloudflare"
import { shopify } from "../shopify.server"

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





export async function action({ context, request }: ActionFunctionArgs) {
    const { admin } = await shopify(context).authenticate.admin(request)
    const { OLLAMA_API_KEY } = context.cloudflare.env
    const OLLAMA_BASE_URL = "https://ollama.com/api/chat"

    const formData = await request.formData()
    const resourceTypesValue = formData.get("resourceTypes")

    if (typeof resourceTypesValue !== "string") {
        return new Response(JSON.stringify({ success: false, error: "resourceTypes mancante" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    let selectedTypes: string[]
    try {
        selectedTypes = JSON.parse(resourceTypesValue)
    } catch {
        return new Response(JSON.stringify({ success: false, error: "resourceTypes non valido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Nessun tipo di risorsa selezionato" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            let completed = 0
            let failed = 0
            let skipped = 0
            let processed = 0
            const errors: { resourceId: string; type: string; error: string }[] = []

            const send = (event: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            }

            try {
                // Prima recuperiamo tutte le risorse: così conosciamo il totale
                // e possiamo mostrare una percentuale reale nel frontend.
                const resources: {
                    resourceId: string
                    resourceType: string
                    translatableContent: {
                        key: string
                        value: string
                        digest: string
                        locale: string
                    }[]
                }[] = []

                send({ event: "discovery_start", total: 0, discovered: 0 })

                for (let typeIndex = 0; typeIndex < selectedTypes.length; typeIndex++) {
                    const resourceType = selectedTypes[typeIndex]

                    send({
                        event: "type_start",
                        resourceType,
                        typeIndex: typeIndex + 1,
                        typeCount: selectedTypes.length,
                        phase: "discovery",
                    })

                    let cursor: string | null = null
                    let hasNextPage = true

                    while (hasNextPage) {
                        const response = await admin.graphql(GET_TRANSLATABLE_RESOURCES, {
                            variables: { type: resourceType, after: cursor },
                        })

                        const json = await response.json() as any

                        if (json.errors?.length) {
                            throw new Error(json.errors.map((e: any) => e.message).join("; "))
                        }

                        const data = json.data?.translatableResources

                        if (!data) {
                            throw new Error(
                                `Shopify non ha restituito translatableResources per ${resourceType}`
                            )
                        }

                        for (const { node } of data.edges ?? []) {
                            resources.push({
                                resourceId: node.resourceId,
                                resourceType,
                                translatableContent: node.translatableContent ?? [],
                            })
                        }

                        send({
                            event: "discovery_progress",
                            discovered: resources.length,
                            total: resources.length,
                            resourceType,
                            typeIndex: typeIndex + 1,
                            typeCount: selectedTypes.length,
                        })

                        hasNextPage = data.pageInfo?.hasNextPage ?? false
                        cursor = data.pageInfo?.endCursor ?? null

                        if (hasNextPage) await sleep(300)
                    }
                }

                const total = resources.length

                send({ event: "discovery_done", total, discovered: total })

                if (total === 0) {
                    send({
                        event: "done",
                        completed: 0,
                        failed: 0,
                        skipped: 0,
                        processed: 0,
                        total: 0,
                        errors: [],
                    })
                    controller.close()
                    return
                }

                // Ora traduciamo una risorsa alla volta e inviamo un evento SSE
                // dopo ogni risorsa completata, saltata o fallita.
                let lastType = ""

                for (const resource of resources) {
                    const { resourceId, resourceType, translatableContent } = resource

                    if (resourceType !== lastType) {
                        lastType = resourceType

                        send({
                            event: "type_start",
                            resourceType,
                            phase: "translation",
                            typeIndex: selectedTypes.indexOf(resourceType) + 1,
                            typeCount: selectedTypes.length,
                            total,
                        })
                    }

                    const fieldsToTranslate = translatableContent.filter(
                        (f) => f.value && f.value.trim() !== "" && f.locale !== "en"
                    )

                    if (fieldsToTranslate.length === 0) {
                        skipped++
                        processed++

                        send({
                            event: "progress",
                            resourceId,
                            resourceType,
                            completed,
                            failed,
                            skipped,
                            processed,
                            total,
                            percent: Math.round((processed / total) * 100),
                            status: "skipped",
                        })

                        continue
                    }

                    try {
                        const translated = await translateWithOllama(
                            fieldsToTranslate,
                            OLLAMA_BASE_URL,
                            OLLAMA_API_KEY
                        )

                        const regResponse = await admin.graphql(REGISTER_TRANSLATIONS, {
                            variables: {
                                resourceId,
                                translations: translated.map((t, i) => ({
                                    locale: "en",
                                    key: fieldsToTranslate[i].key,
                                    value: t.translated,
                                    translatableContentDigest: fieldsToTranslate[i].digest,
                                })),
                            },
                        })

                        const regJson = await regResponse.json() as any

                        if (regJson.errors?.length) {
                            throw new Error(
                                regJson.errors.map((e: any) => e.message).join("; ")
                            )
                        }

                        const userErrors = regJson.data?.translationsRegister?.userErrors ?? []

                        if (userErrors.length > 0) {
                            throw new Error(
                                userErrors.map((e: any) => e.message).join("; ")
                            )
                        }

                        completed++
                        processed++

                        send({
                            event: "progress",
                            resourceId,
                            resourceType,
                            completed,
                            failed,
                            skipped,
                            processed,
                            total,
                            percent: Math.round((processed / total) * 100),
                            status: "completed",
                        })
                    } catch (err: any) {
                        failed++
                        processed++

                        const errorMessage = err?.message || "Errore durante la traduzione"

                        console.error(`Errore su risorsa ${resourceId}:`, errorMessage)

                        errors.push({
                            resourceId,
                            type: resourceType,
                            error: errorMessage,
                        })

                        send({
                            event: "error",
                            resourceId,
                            resourceType,
                            completed,
                            failed,
                            skipped,
                            processed,
                            total,
                            percent: Math.round((processed / total) * 100),
                            error: errorMessage,
                        })
                    }

                    await sleep(200)
                }

                send({
                    event: "done",
                    completed,
                    failed,
                    skipped,
                    processed,
                    total,
                    errors,
                })

                controller.close()
            } catch (err: any) {
                const errorMessage = err?.message || "Errore durante la traduzione"

                console.error("Errore fatale traduzione:", errorMessage)

                send({
                    event: "fatal_error",
                    error: errorMessage,
                    completed,
                    failed,
                    skipped,
                    processed,
                    total: 0,
                })

                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    })
}


import { useState } from "react"
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

export default function TranslatePage() {
    const [selected, setSelected] = useState<string[]>([])
    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [completed, setCompleted] = useState(0)
    const [failed, setFailed] = useState(0)
    const [skipped, setSkipped] = useState(0)
    const [processed, setProcessed] = useState(0)
    const [total, setTotal] = useState(0)
    const [percent, setPercent] = useState(0)
    const [currentType, setCurrentType] = useState("")
    const [errors, setErrors] = useState<any[]>([])
    const [fatalError, setFatalError] = useState("")
    const [phase, setPhase] = useState("")

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
        setSkipped(0)
        setProcessed(0)
        setTotal(0)
        setPercent(0)
        setCurrentType("")
        setErrors([])
        setFatalError("")
        setPhase("")
    }

    function handleEvent(event: any) {
        switch (event.event) {
            case "discovery_start":
                setPhase("Analisi delle risorse Shopify...")
                setPercent(0)
                setTotal(0)
                break

            case "discovery_progress":
                setPhase("Ricerca delle risorse...")
                setTotal(event.total ?? 0)
                break

            case "discovery_done":
                setPhase("Preparazione della traduzione...")
                setTotal(event.total ?? 0)
                setPercent(0)
                break

            case "type_start":
                setCurrentType(event.resourceType || "")
                setPhase(event.phase === "discovery" ? "Ricerca delle risorse..." : "Traduzione...")
                break

            case "progress":
                setCompleted(event.completed ?? 0)
                setFailed(event.failed ?? 0)
                setSkipped(event.skipped ?? 0)
                setProcessed(event.processed ?? 0)
                setTotal(event.total ?? 0)
                setPercent(event.percent ?? 0)

                if (event.resourceType) setCurrentType(event.resourceType)
                break

            case "error":
                setCompleted(event.completed ?? 0)
                setFailed(event.failed ?? 0)
                setSkipped(event.skipped ?? 0)
                setProcessed(event.processed ?? 0)
                setTotal(event.total ?? 0)
                setPercent(event.percent ?? 0)

                if (event.resourceType) setCurrentType(event.resourceType)

                setErrors(prev => [
                    ...prev,
                    {
                        resourceId: event.resourceId,
                        type: event.resourceType,
                        error: event.error,
                    },
                ])
                break

            case "done":
                setCompleted(event.completed ?? 0)
                setFailed(event.failed ?? 0)
                setSkipped(event.skipped ?? 0)
                setProcessed(event.processed ?? 0)
                setTotal(event.total ?? 0)
                setPercent(100)
                setErrors(event.errors ?? [])
                setDone(true)
                setRunning(false)
                setCurrentType("")
                setPhase("")
                break

            case "fatal_error":
                setCompleted(event.completed ?? 0)
                setFailed(event.failed ?? 0)
                setSkipped(event.skipped ?? 0)
                setProcessed(event.processed ?? 0)
                setFatalError(event.error || "Errore durante la traduzione")
                setDone(true)
                setRunning(false)
                setCurrentType("")
                setPhase("")
                break
        }
    }

    async function handleStart() {
        if (selected.length === 0 || running) return

        setRunning(true)
        setDone(false)
        setCompleted(0)
        setFailed(0)
        setSkipped(0)
        setProcessed(0)
        setTotal(0)
        setPercent(0)
        setErrors([])
        setFatalError("")
        setCurrentType("")
        setPhase("Connessione...")

        const formData = new FormData()
        formData.append("resourceTypes", JSON.stringify(selected))

        try {
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
                throw new Error("Il browser non ha ricevuto lo stream di traduzione")
            }

            const reader = response.body
                .pipeThrough(new TextDecoderStream())
                .getReader()

            let buffer = ""

            while (true) {
                const { done: streamDone, value } = await reader.read()
                if (streamDone) break

                buffer += value

                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    const trimmed = line.trim()

                    if (!trimmed || !trimmed.startsWith("data:")) continue

                    try {
                        const jsonString = trimmed.replace(/^data:\s*/, "")
                        handleEvent(JSON.parse(jsonString))
                    } catch (parseError) {
                        console.error("Errore parsing evento SSE:", parseError, trimmed)
                    }
                }
            }

            // Gestisce anche un eventuale ultimo evento rimasto nel buffer.
            const lastLine = buffer.trim()

            if (lastLine.startsWith("data:")) {
                try {
                    const jsonString = lastLine.replace(/^data:\s*/, "")
                    handleEvent(JSON.parse(jsonString))
                } catch (parseError) {
                    console.error("Errore parsing ultimo evento SSE:", parseError)
                }
            }
        } catch (err: any) {
            console.error("Errore traduzione:", err)
            setFatalError(err?.message || "Errore durante la connessione alla traduzione")
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
                                </Text>
                            )}

                            <ProgressBar
                                progress={Math.max(0, Math.min(100, percent))}
                                size="large"
                                tone={fatalError ? "critical" : "success"}
                            />

                            <Text as="p">
                                <strong>{percent}%</strong>
                                {" — "}
                                {processed} / {total} risorse elaborate
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

                            {done && !fatalError && (
                                <Banner tone="success">
                                    Traduzione completata! {completed} risorse tradotte
                                    {failed > 0 ? `, ${failed} errori` : ""}
                                    {skipped > 0 ? `, ${skipped} saltate` : ""}.
                                </Banner>
                            )}

                            {fatalError && (
                                <Banner tone="critical">
                                    Errore: {fatalError}
                                </Banner>
                            )}

                            {errors.length > 0 && (
                                <BlockStack gap="200">
                                    <Text variant="headingSm" as="h3">
                                        Dettaglio errori:
                                    </Text>

                                    <List type="bullet">
                                        {errors.map((e, i) => (
                                            <List.Item key={`${e.resourceId}-${i}`}>
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


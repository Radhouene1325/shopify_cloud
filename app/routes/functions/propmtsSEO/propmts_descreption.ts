import { type VARIBALES } from "@/routes/app.descreptionupdated";

type OutputField = "shortDescription";

export function buildPrompt(chunk: VARIBALES[], _outputField: OutputField = "shortDescription"): string {
  const outputStructure =
    '{ "id": "original_product_id", "title": "PRODUCT_TITLE", "shortDescription": "TIKTOK_SAFE_SIMPLE_HTML" }';

  return `Sei una JSON API specializzata nella creazione di descrizioni prodotto brevi, semplici e compatibili con TikTok Shop.

OBIETTIVO:
Generare SOLO una shortDescription in HTML semplice per ogni prodotto.
Non generare altri campi di descrizione.
Non generare microdata, Schema.org, meta tag, link, tabelle o contenuti nascosti.

FORMATO OUTPUT:
Restituisci SOLO un array JSON valido.
Ogni oggetto deve rispettare ESATTAMENTE questa struttura:
${outputStructure}

REGOLE TIKTOK SHOP 2026 - OBBLIGATORIE:
- Scrivi solo informazioni prodotto fattuali presenti nei dati forniti.
- Non inventare materiale, taglia, modello, certificazione, garanzia, sconto, spedizione, disponibilita o risultati.
- Non usare claim medici/salute: cure, treats, heals, guarisce, cura, dimagrante, ortopedico, sollievo dal dolore, postura, anti-age, FDA approved, 100% safe.
- Non usare claim trasformativi: prima/dopo, before/after, risultati visibili, trasformazione del corpo, risultati rapidi o permanenti.
- Non usare promesse assolute o non verificate: guaranteed, miracle, perfect, unbeatable, best in the world, miglior prodotto, best price, instant result.
- Non usare termini legati a contraffazione o imitazione: fake, dupe, replica, knockoff, copy, 1:1, inspired by, lookalike, style [brand].
- Non usare "official", "authentic", "licensed" o "certified" se non sono provati esplicitamente nei dati.
- Non fare confronti diretti con brand, concorrenti, marketplace o piattaforme.
- Non menzionare TikTok Shop, Amazon, Shopify, WhatsApp, email, numeri di telefono, siti esterni, social handle o link esterni nella descrizione generata.
- Non creare falsa urgenza: ultime unita, solo oggi, offerta in scadenza, stock limitato, scade tra 1 ora.
- Non usare emoji, hashtag, ALL CAPS, simboli eccessivi o punteggiatura spam.
- Evita keyword stuffing: usa parole chiave naturali solo quando aiutano a descrivere il prodotto.
- Se un'informazione e incerta, omettila.

REGOLE HTML:
- Usa solo questi tag: <p>, <br>, <ul>, <li>, <strong>.
- Non usare <div>, <section>, <article>, <h1>, <h2>, <h3>, <table>, <img>, <meta>, <link>, <script>, <style>, itemscope, itemprop, classi, ID, bottoni o form.
- Non includere URL grezzi.
- La shortDescription deve essere pulita, breve e leggibile su mobile.
- Effettua escape di tutte le virgolette dentro le stringhe HTML.

STRUTTURA DELLA shortDescription:
- Primo <p>: titolo prodotto o nome prodotto in forma breve e naturale.
- Poi una lista <ul> con 3-5 <li>.
- Ogni <li> deve parlare di una caratteristica reale: tipo prodotto, brand se presente, colore, materiale, taglia, stile, uso, dettagli tecnici presenti.
- Ultimo <p>: frase neutra, senza sconti, urgenza, garanzie o promesse.
- Frase finale neutra consigliata: "Consulta i dettagli del prodotto e scegli la variante piu adatta alle tue esigenze."

DATI DA ELABORARE:
${JSON.stringify(
    chunk.map((product) => ({
      id: product.id,
      title: product.title,
      vendor: product.vendor,
      description: product.descreption,
    })),
    null,
    2
  )}

ISTRUZIONI:
1. Analizza ogni prodotto separatamente.
2. Mantieni esattamente l'id originale.
3. Copia il titolo prodotto nel campo "title".
4. Genera solo il campo "shortDescription".
5. La shortDescription deve essere HTML semplice e policy-safe.
6. Rimuovi o riscrivi parole rischiose dalla descrizione originale.
7. Se la descrizione originale contiene link, contatti esterni, script, meta tag, recensioni, claim non verificati o parole vietate, non copiarli.
8. Non produrre altri campi di descrizione in nessun caso.

Restituisci un array JSON con ESATTAMENTE ${chunk.length} oggetti.
Restituisci SOLO JSON puro.
Niente markdown.
Nessuna spiegazione.`;
}

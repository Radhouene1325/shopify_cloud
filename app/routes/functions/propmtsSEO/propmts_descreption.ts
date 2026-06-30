import { type VARIBALES } from "@/routes/app.descreptionupdated";

type OutputField = "shortDescription";
type PromptProduct = VARIBALES & {
  image?: string;
  images?: any;
  media?: any;
  featuredMedia?: any;
};
type PromptInput = PromptProduct | PromptProduct[];

function extractImagesFromHtml(html = "") {
  const images: Array<{ url: string; alt?: string }> = [];
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) && images.length < 3) {
    const tag = match[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1];
    images.push({ url: match[1], alt });
  }

  return images;
}

function collectImageCandidates(product: PromptProduct) {
  const candidates: Array<{ url: string; alt?: string; width?: number; height?: number }> = [];

  if (product.image) {
    candidates.push({
      url: product.image,
      alt: product.title,
    });
  }

  const featuredImage = product.featuredMedia?.image;
  if (featuredImage?.url) {
    candidates.push({
      url: featuredImage.url,
      alt: featuredImage.altText || product.title,
      width: featuredImage.width,
      height: featuredImage.height,
    });
  }

  const imageEdges = Array.isArray(product.images)
    ? product.images
    : Array.isArray(product.images?.edges)
      ? product.images.edges
    : Array.isArray(product.media?.edges)
      ? product.media.edges
      : [];

  imageEdges.forEach((edge: any) => {
    const image = edge?.node?.image || edge?.image || edge?.node;
    if (image?.url) {
      candidates.push({
        url: image.url,
        alt: image.altText || image.alt,
        width: image.width,
        height: image.height,
      });
    }
  });

  extractImagesFromHtml(product.descreption).forEach((image) => candidates.push(image));

  return candidates
    .filter((image) => typeof image.url === "string" && image.url.startsWith("https://"))
    .filter(
      (image, index, all) => all.findIndex((item) => item.url === image.url) === index
    )
    .slice(0, 3);
}

export function buildPrompt(input: PromptInput, _outputField: OutputField = "shortDescription"): string {
  const products = Array.isArray(input) ? input : [input];
  const outputStructure =
    '{ "id": "original_product_id", "title": "TIKTOK_SAFE_PRODUCT_TITLE", "shortDescription": "TIKTOK_SAFE_SIMPLE_HTML" }';

  return `Sei una JSON API specializzata nella creazione di titoli e descrizioni prodotto brevi, semplici e compatibili con TikTok Shop.

OBIETTIVO:
Generare SOLO un title policy-safe e una shortDescription in HTML semplice per ogni prodotto.
Non generare altri campi.
Non generare microdata, Schema.org, meta tag, link, tabelle o contenuti nascosti.
Se ci sono immagini prodotto idonee, puoi includere 2-3 immagini nella shortDescription seguendo le regole immagini sotto.

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

REGOLE TITLE:
- Il campo "title" deve essere riscritto in modo pulito, fattuale e compatibile con TikTok Shop.
- Usa solo dati verificabili: tipo prodotto, brand/vendor se presente, modello, colore, materiale, taglia o uso se presenti nei dati.
- Non copiare parole rischiose dal titolo originale.
- Non usare HTML nel title.
- Non usare emoji, hashtag, ALL CAPS, simboli promozionali, claims assoluti o urgenza falsa.
- Non usare "viral", "trend", "best seller", "link in bio", "TikTok made me buy it", "official", "authentic" o "guaranteed".
- Lunghezza consigliata: 40-120 caratteri.

REGOLE HTML:
- Usa solo questi tag: <p>, <br>, <ul>, <li>, <strong>, <img>.
- Non usare <div>, <section>, <article>, <h1>, <h2>, <h3>, <table>, <meta>, <link>, <script>, <style>, itemscope, itemprop, classi, ID, bottoni o form.
- Non includere URL grezzi. Gli URL sono consentiti solo nel valore src degli <img> copiati dai dati prodotto.
- La shortDescription deve essere pulita, breve e leggibile su mobile.
- Effettua escape di tutte le virgolette dentro le stringhe HTML.

REGOLE IMMAGINI TIKTOK SHOP 2026:
- Usa solo immagini presenti nei dati prodotto sotto "images"; non inventare mai URL immagine.
- Inserisci massimo 3 immagini, idealmente 2-3 se sono disponibili e sicure.
- Le immagini devono rappresentare chiaramente il prodotto venduto e cio che il cliente ricevera.
- Non usare immagini placeholder, rendering digitali non verificabili, immagini in bianco e nero, immagini duplicate dello stesso angolo o immagini non pertinenti.
- Non usare immagini con watermark, loghi aggiunti, bordi, grafiche, QR code, testo promozionale, contatti, URL, social handle o riferimenti ad altre piattaforme.
- Non usare immagini che suggeriscono fake, dupe, replica, knockoff, before/after, risultati medici, perdita peso, contenuti sessuali, violenti, discriminatori o vietati.
- Se width/height sono disponibili, preferisci immagini almeno 600x600.
- Se non puoi verificare che un'immagine sia policy-safe dai dati forniti, ometti l'immagine.
- Ogni <img> deve avere src HTTPS e alt descrittivo/fattuale senza keyword stuffing.

STRUTTURA DELLA shortDescription:
- Primo <p>: titolo prodotto o nome prodotto in forma breve e naturale.
- Poi una lista <ul> con 3-5 <li>.
- Ogni <li> deve parlare di una caratteristica reale: tipo prodotto, brand se presente, colore, materiale, taglia, stile, uso, dettagli tecnici presenti.
- Se ci sono immagini policy-safe, aggiungi 2-3 tag <img> dopo la lista e prima del paragrafo finale.
- Ultimo <p>: frase neutra, senza sconti, urgenza, garanzie o promesse.
- Frase finale neutra consigliata: "Consulta i dettagli del prodotto e scegli la variante piu adatta alle tue esigenze."

DATI DA ELABORARE:
${JSON.stringify(
    products.map((product) => ({
      id: product.id,
      title: product.title,
      vendor: product.vendor,
      description: product.descreption,
      images: collectImageCandidates(product),
    })),
    null,
    2
  )}

ISTRUZIONI:
1. Analizza ogni prodotto separatamente.
2. Mantieni esattamente l'id originale.
3. Genera nel campo "title" un titolo TikTok Shop policy-safe basato solo sui dati reali del prodotto.
4. Genera il campo "shortDescription".
5. La shortDescription deve essere HTML semplice e policy-safe.
6. Rimuovi o riscrivi parole rischiose dal titolo e dalla descrizione originale.
7. Se la descrizione originale contiene link, contatti esterni, script, meta tag, recensioni, claim non verificati o parole vietate, non copiarli.
8. Non produrre altri campi in nessun caso.

Restituisci un array JSON con ESATTAMENTE ${products.length} oggetti.
Restituisci SOLO JSON puro.
Niente markdown.
Nessuna spiegazione.`;
}
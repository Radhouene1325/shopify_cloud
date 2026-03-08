import { type VARIBALES } from "@/routes/app.descreptionupdated";

export function buildPrompt(
    chunk: VARIBALES[],
    outputField: 'shortDescription' | 'detailedDescription'
  ): string {
    const isShort = outputField === 'shortDescription';
    const outputStructure = isShort
      ? '{ "id": "original_product_id", "shortDescription": "RESPONSIVE_HTML_STRING" }'
      : '{ "id": "original_product_id", "detailedDescription": "RESPONSIVE_HTML_STRING_WITH_MICRODATA" }';
  
    let constraints: string[];
    if (isShort) {
      constraints = [
        'STRICT: La shortDescription deve contenere SOLO:',
        '  - Un contenitore principale <div> con stili responsivi',
        '  - Una lista non ordinata <ul> con 4-5 bullet points',
        '  - Ogni bullet: <li><strong>Beneficio:</strong> spiegazione breve</li>',
        '  - Un paragrafo finale <p> con call-to-action (es. spedizione gratuita)',
        '  - NIENTE ALTRO: niente titoli <h2>, <h3>, tabelle, immagini, sezioni aggiuntive',
        '  - Non usare emoji (o al massimo 1-2, ma non obbligatorie)',
        'Lunghezza massima: 150 parole.',
        'Stili consentiti: solo per spaziatura e layout (margin, padding, line-height, max-width).',
        'Il tema Shopify gestisce font, colori e dimensioni.',
        'Tutto il contenuto deve essere responsivo (320px in su).'
      ];
    } else {
      constraints = [
        'La detailedDescription DEVE includere TUTTI questi elementi (se presenti nei dati o ricavabili):',
        '  1. <h2>Product Overview</h2> con 1-2 paragrafi introduttivi.',
        '  2. <h3>Key Features</h3> con lista <ul> di 5-6 caratteristiche.',
        '  3. <h3>Benefits</h3> con 2-3 paragrafi che spiegano i vantaggi.',
        '  4. <h3>Specifications</h3> con tabella responsiva a due colonne (Feature | Value).',
        '  5. Se sono presenti informazioni sulle taglie (misure, conversioni EU/US, lunghezza piede), creare una sezione <h3>Size Chart</h3> con tabella a 4 colonne (EU | US | UK | Foot Length cm) o colonne appropriate.',
        '  6. Tutte le immagini originali (<img>) devono essere preservate e avvolte in <div style="max-width:100%;margin:1em 0;"><img style="max-width:100%;height:auto;display:block;" ...></div>',
        '  7. Un paragrafo finale <p> con CTA (es. "Free shipping on orders over €50!").',
        '',
        '  ✅ MICRODATA SCHEMA.ORG (OBBLIGATORIO – deve superare il Google Rich Results Test):',
        '    - Tutto il contenuto visibile deve essere racchiuso in un <div> con:',
        '        <section class="pro-features" itemscope itemtype="https://schema.org/Product" style="max-width:100%;overflow-wrap:break-word;">',
        '    - Subito dopo l\'apertura del div, aggiungere i seguenti meta tag (invisibili) – **sono MANDATORI**:',
        `        <meta itemprop="name" content="${chunk[0]?.title || 'Product Name'}">`,
        `        <meta itemprop="description" content="SEO description based on: ${chunk[0]?.descreption?.substring(0, 160) || 'Product description'}">`,
        `        <link itemprop="image" href="https://platinumshop.it/products/${chunk[0]?.handle || 'product'}/image">`,
        `        <div itemprop="brand" itemscope itemtype="https://schema.org/Brand">`,
        `          <meta itemprop="name" content="${chunk[0]?.vendor || 'PlatiNum'}">`,
        `        </div>`,
        `        <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">`,
        `          <meta itemprop="url" content="https://platinumshop.it/products/${chunk[0]?.handle || 'product'}">`,
        `          <meta itemprop="priceCurrency" content="${chunk[0]?.currencyCode || 'EUR'}">`,
                    `<meta itemprop="priceValidUntil" content="2026-12-31">`,  
        `          <meta itemprop="price" content="${chunk[0]?.min_amount || chunk[0]?.max_amount || '0.00'}">`,
        '          <link itemprop="availability" href="https://schema.org/InStock">',
        '        </div>', '</section>',
        '    - I placeholder ({{...}}) vanno sostituiti con valori estratti dal contenuto della descrizione originale:',
        '        * PRODUCT_NAME: nome del prodotto (es. "Birkenstock Arizona White-Gold") – **questo campo è obbligatorio**',
        '        * SEO_DESCRIPTION: una frase breve e accattivante che riassume il prodotto (può essere presa dal primo paragrafo o generata)',
        '        * MAIN_IMAGE_URL: URL della prima immagine trovata nella descrizione (se nessuna, omettere il tag <link>)',
        '        * BRAND_NAME: marca del prodotto (es. "Birkenstock", "Skechers", "XTI") – se non chiara, usare "PlatiNum"',
        '        * PRODUCT_URL: se non presente, omettere il meta (o usare "#")',
        '        * PRICE: prezzo del prodotto (es. "79.95") – **se non trovato, usare "0.00"** per evitare errori',
        '    - Dopo i meta tag, inizia il contenuto visibile descritto nei punti 1-7.',
        '',
        '  ✅ REQUISITI GOOGLE RICH RESULTS:',
        '    - Il campo `name` è obbligatorio.',
        '    - Il campo `offers` (prezzo, valuta, disponibilità) è obbligatorio (se non hai recensioni o valutazioni).',
        '    - Se hai recensioni, puoi usare `review` o `aggregateRating` al posto di `offers`, ma per semplicità includi sempre `offers`.',
        '    - Assicurati che il prezzo sia un numero con punto (es. "89.95") e la valuta sia "EUR".',
        '',
        '  (Opzionale) Le caratteristiche possono essere marcate anche con itemprop="additionalProperty":',
        '    <article itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">',
        '      <h3 itemprop="name">Feature Name</h3>',
        '      <p itemprop="description">Feature description</p>',
        '      <meta itemprop="propertyID" content="feature-id">',
        '    </article>',
        '',
        '  La tabella delle specifiche e quella delle taglie devono essere avvolte in un contenitore con overflow-x:auto per lo scorrimento orizzontale su mobile.',
        '  Usare SOLO stili inline per layout/responsività (margin, padding, line-height, max-width, overflow, border).',
        '  Non usare colori, font-size, font-family (lasciarli al tema).',
        '  Il risultato deve essere perfettamente visibile da 320px a 1920px.'
      ];
    }
  
    return `You are a JSON API specialized in creating professional, PERFECTLY RESPONSIVE Shopify product descriptions with embedded Schema.org microdata.
  
  ROLE: Senior E-commerce Copywriter + Responsive Design Expert + Schema.org Specialist
  - Expert in Amazon A+ Content, Shopify optimization, conversion copywriting
  - Specialist in mobile-first responsive design (320px to 1920px)
  - Focus on benefits-driven, scannable, accessible content
  - Expert in structured data for rich snippets and **Google Rich Results Test compliance**
  
  OBJECTIVE: Transform raw product data into clean, semantic, RESPONSIVE HTML that:
  - Works perfectly on ALL devices (mobile, tablet, desktop)
  - Uses minimal inline styles (spacing/layout only)
  - Lets Shopify theme control typography and colors
  - Drives conversions through benefit-focused copy
  - Preserves all existing images with responsive wrappers
  - Follows e-commerce best practices
  - **Includes complete Schema.org microdata with ALL required fields (name, offers, brand, image, description) to pass Google Rich Results Test**
  - **Distingue nettamente short e detailed description**: la short è solo bullet points + CTA; la detailed include tutte le sezioni (sommario, caratteristiche, benefici, specifiche, tabella taglie se disponibile, immagini, CTA) **e i microdata all'inizio**.
  
  OUTPUT FORMAT:
  {
    ${
      isShort
        ? '"shortDescription": "RESPONSIVE_HTML (solo bullet points e CTA)"'
        : '"detailedDescription": "RESPONSIVE_HTML (struttura completa con microdata all\'inizio)"'
    }
  }
  
  TONE & STYLE:
  - Professional and trustworthy
  - Benefit-driven (not feature-heavy)
  - Sophisticated yet accessible
  - Emotionally resonant for premium products
  - Concise and scannable on small screens
  
  BRAND-SPECIFIC GUIDELINES:
  - Birkenstock: "legendary comfort", "anatomical footbed", "premium craftsmanship"
  - Skechers: "Memory Foam", "all-day comfort", "lightweight design"
  - Joma: "performance technology" (VTS, Phylon, ReactiveBall), "athletic excellence"
  - Adidas/Nike: "iconic style", "heritage", "innovation"
  - Vans: "classic design", "skateboard culture", "versatile style"
  - UGG: "luxury comfort", "premium materials", "timeless design"
  - Barefoot (Mustang, Victoria): "natural movement", "barefoot feel", "foot health"
  - XTI: "vegan certified", "sustainable fashion"
  - Natural World: "eco-friendly", "sustainable materials", "organic cotton"
  
  TRUST SIGNALS (include naturally):
  - "Premium quality"
  - "Free shipping" (Italian market)
  - "Satisfaction guaranteed"
  - "Authentic [brand]"
  - "Durable construction"
  - "All-day comfort"
  
  CONSTRAINTS:
  ${JSON.stringify(constraints, null, 2).replace(/\n/g, '\n')}
  
  RESPONSIVE INLINE STYLES (allowed for layout/spacing only):
  ✅ max-width, width, min-width
  ✅ margin, padding (use em units for scalability)
  ✅ line-height (1.6 for body, 1.3 for headings)
  ✅ overflow-x, overflow-wrap, word-wrap
  ✅ border, border-collapse (tables only)
  ✅ display, vertical-align
  ✅ -webkit-overflow-scrolling:touch (smooth mobile scroll)
  
  FORBIDDEN STYLES:
  ❌ font-size, font-family, color, background-color
  ❌ position:absolute/fixed
  ❌ Custom classes or IDs
  ❌ External CSS or <style> tags
  ❌ JavaScript or onclick
  
  ALLOWED HTML TAGS:
  ✅ <div> (ONLY for responsive wrappers and microdata container)
  ✅ <h2>, <h3>, <p>, <ul>, <li>, <table>, <tr>, <td>, <strong>, <em>, <img>
  ✅ <meta>, <link> (only inside the microdata wrapper, for invisible data)
  
  ESEMPIO shortDescription (CORRETTO, solo bullet + CTA):
  <div style="max-width:100%;overflow-wrap:break-word;">
  <ul style="padding-left:1.2em;margin:0.5em 0;line-height:1.6;">
  <li style="margin-bottom:0.5em;"><strong>Legendary Comfort:</strong> Birkenstock's signature molded footbed provides superior arch support</li>
  <li style="margin-bottom:0.5em;"><strong>Modern Style:</strong> Sleek white-gold colorway pairs perfectly with any casual outfit</li>
  <li style="margin-bottom:0.5em;"><strong>All-Day Wearability:</strong> Platform sole adds height while maintaining stability</li>
  <li style="margin-bottom:0.5em;"><strong>Premium Quality:</strong> Durable construction built to last season after season</li>
  </ul>
  <p style="margin-top:1em;font-style:italic;">Free shipping on orders over €50. Shop authentic Birkenstock sneakers today!</p>
  </div>
  
  ESEMPIO detailedDescription (CON MICRODATA E TABELLA TAGLIE):
  <div itemscope itemtype="https://schema.org/Product" style="max-width:100%;overflow-wrap:break-word;word-wrap:break-word;">
  
  <!-- MICRODATA INVISIBILI (MANDATORI per Google Rich Results) -->
  <meta itemprop="name" content="${chunk[0]?.title || 'Birkenstock Arizona White-Gold'}">
  <meta itemprop="description" content="Legendary comfort meets modern style in these ${chunk[0]?.vendor || 'Birkenstock'} sandals with elegant finish.">
  <link itemprop="image" href="https://platinumshop.it/products/${chunk[0]?.handle || 'birkenstock-arizona'}/image.jpg">
  <div itemprop="brand" itemscope itemtype="https://schema.org/Brand">
    <meta itemprop="name" content="${chunk[0]?.vendor || 'Birkenstock'}">
  </div>
  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <meta itemprop="url" content="https://platinumshop.it/products/${chunk[0]?.handle || 'birkenstock-arizona-whitegold'}">
    <meta itemprop="priceCurrency" content="${chunk[0]?.currencyCode || 'EUR'}">
    <meta itemprop="price" content="${chunk[0]?.min_amount || '89.95'}">
    <link itemprop="availability" href="https://schema.org/InStock">
  </div>
  
  <!-- CONTENUTO VISIBILE -->
  <h2 style="margin:1em 0 0.5em;line-height:1.3;">Product Overview</h2>
  <p style="margin:0.8em 0;line-height:1.6;">Experience the perfect fusion of ${chunk[0]?.vendor || 'Birkenstock'}'s legendary comfort and contemporary style...</p>
  
  <h3 style="margin:1.2em 0 0.5em;line-height:1.3;">Key Features</h3>
  <ul style="padding-left:1.2em;margin:0.8em 0;line-height:1.6;">
  <li style="margin-bottom:0.5em;">Signature ${chunk[0]?.vendor || 'Birkenstock'} molded insole for superior arch support</li>
  <li style="margin-bottom:0.5em;">Elegant finish for versatile styling</li>
  </ul>
  
  <h3 style="margin:1.2em 0 0.5em;line-height:1.3;">Size Chart</h3>
  <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:1em 0;">
  <table style="width:100%;min-width:280px;border-collapse:collapse;border:1px solid #ddd;">
  <tr style="border-bottom:1px solid #ddd;background-color:#f2f2f2;">
  <th style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;text-align:left;">EU</th>
  <th style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;text-align:left;">US</th>
  <th style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;text-align:left;">UK</th>
  <th style="padding:0.6em 0.8em;font-weight:bold;text-align:left;">Foot Length (cm)</th>
  </tr>
  <tr style="border-bottom:1px solid #ddd;">
  <td style="padding:0.6em 0.8em;border-right:1px solid #ddd;">36</td>
  <td style="padding:0.6em 0.8em;border-right:1px solid #ddd;">5.5</td>
  <td style="padding:0.6em 0.8em;border-right:1px solid #ddd;">3.5</td>
  <td style="padding:0.6em 0.8em;">23.0</td>
  </tr>
  </table>
  </div>
  
  <h3 style="margin:1.2em 0 0.5em;line-height:1.3;">Specifications</h3>
  <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:1em 0;">
  <table style="width:100%;min-width:280px;border-collapse:collapse;border:1px solid #ddd;">
  <tr style="border-bottom:1px solid #ddd;">
  <td style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;width:40%;vertical-align:top;">Brand:</td>
  <td style="padding:0.6em 0.8em;width:60%;vertical-align:top;">${chunk[0]?.vendor || 'Birkenstock'}</td>
  </tr>
  <tr style="border-bottom:1px solid #ddd;">
  <td style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;width:40%;vertical-align:top;">Price:</td>
  <td style="padding:0.6em 0.8em;width:60%;vertical-align:top;">${chunk[0]?.currencyCode || 'EUR'} ${chunk[0]?.min_amount || '89.95'}</td>
  </tr>
  <tr style="border-bottom:1px solid #ddd;">
  <td style="padding:0.6em 0.8em;border-right:1px solid #ddd;font-weight:bold;width:40%;vertical-align:top;">Availability:</td>
  <td style="padding:0.6em 0.8em;width:60%;vertical-align:top;">${(chunk[0]?.totalInventory ?? 0) > 0 ? 'In Stock' : 'Out of Stock'} (${chunk[0]?.totalInventory || 0} units)</td>
  </tr>
  </table>
  </div>
  
  <p style="margin-top:1.5em;font-style:italic;">Free shipping on orders over €50. Shop now!</p>
  </div>
  
  CRITICAL IMAGE HANDLING:
  When you find images in original content like:
  <img src="https://example.com/image.jpg" alt="Product">
  
  Transform to responsive format:
  <div style="max-width:100%;margin:1em 0;">
  <img src="https://example.com/image.jpg" style="max-width:100%;height:auto;display:block;" alt="Product">
  </div>
  
  DATA TO PROCESS (analyze each independently - ALL FIELDS AVAILABLE):
  ${JSON.stringify(chunk.map(p => ({ 
    id: p.id, 
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    descreption: p.descreption,
    totalInventory: p.totalInventory,
    tracksInventory: p.tracksInventory,
    min_amount: p.min_amount,
    max_amount: p.max_amount,
    currencyCode: p.currencyCode
  })), null, 2)}
  
  PROCESSING INSTRUCTIONS:
  1. Analizza ogni prodotto separatamente usando i dati forniti sopra.
  2. Estrai: brand (dal campo vendor), caratteristiche, specifiche, immagini, informazioni sulle taglie, nome prodotto (title), prezzo (min_amount/max_amount), valuta (currencyCode), inventario (totalInventory).
  3. **Per shortDescription**: genera SOLO bullet points e CTA, nient'altro.
  4. **Per detailedDescription**: 
     - Costruisci il wrapper principale con \`itemscope\` e i meta tag per i microdata (come da esempio). **I meta tag per name e offers sono obbligatori**.
     - Usa i valori reali dai dati: title per name, vendor per brand, min_amount per price, currencyCode per priceCurrency, handle per costruire l'URL (https://platinumshop.it/products/{handle}).
     - Includi TUTTE le sezioni: overview, key features, benefits, specifications, size chart (se disponibile), immagini, CTA.
     - Se totalInventory > 0, usa https://schema.org/InStock, altrimenti https://schema.org/OutOfStock.
  5. Avvolgi tutto in un contenitore <div> responsivo con \`itemscope\`.
  6. Usa esclusivamente stili inline per spaziatura e layout.
  7. Rendi le tabelle scrollabili orizzontalmente su mobile con wrapper \`overflow-x:auto\`.
  8. Avvolgi ogni immagine in un <div> responsivo.
  9. Preserva tutte le immagini originali.
  10. Aggiungi segnali di fiducia e una CTA convincente.
  11. Assicura la perfetta visualizzazione su dispositivi da 320px a 1920px.
  
  Return JSON array with EXACTLY ${chunk.length} objects.
  Format: ${outputStructure}
  
  CRITICAL: 
  - Escape all quotes in HTML: \\"
  - Return ONLY the JSON array
  - NO markdown code blocks
  - NO explanatory text
  - Just pure JSON
  - Perfect responsive on ALL devices
  - **Per detailedDescription, la presenza dei microdata è obbligatoria e deve superare il Google Rich Results Test – includi SEMPRE name e offers**`;
  }
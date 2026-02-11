import { type LoaderFunctionArgs } from "@remix-run/node";



export async function loader({context,request}:LoaderFunctionArgs){
    
    const response = await fetch("https://toothsomely-unremanded-chadwick.ngrok-free.dev/api/generate", {method:"post",headers: {
        "Content-Type": "application/json"
      }
,      
        body:JSON.stringify(
            {
                options: {
                    temperature: 0.7
                  },
                stream: false,
                model: "deepseek-coder:latest",
                prompt: `
            You are an expert eCommerce SEO specialist.
            
            Rewrite the following product description into:
            - Professional HTML
            - SEO optimized
            - Use semantic tags
            - Add headings (H2, H3)
            - Add bullet benefits
            - Add call-to-action
            - Keep Shopify compatible
            - Return ONLY clean HTML
            - and generated vedio presetion fo the imges product
            - if existe jeson in the descreption maked in table pro in 3 colone
            
            HTML:
          <h1>SPECIFICATIONS</h1>
<p><span>CN</span>: <span style="color: #333;">Henan</span></p>
<p><span>Colletto</span>: <span style="color: #333;">Collo a O</span></p>
<p><span>Composizione dei materiali</span>: <span style="color: #333;">cotton</span></p>
<p><span>Decorazione</span>: <span style="color: #333;">Applique</span></p>
<p><span>Genere</span>: <span style="color: #333;">UOMINI</span></p>
<p><span>L'arte della tessitura</span>: <span style="color: #333;">Non tessuto</span></p>
<p><span>Lunghezza esterna</span>: <span style="color: #333;">Nove centesimi</span></p>
<p><span>Lunghezza manica (cm)</span>: <span style="color: #333;">Pieno</span></p>
<p><span>Luogo di origine</span>: <span style="color: #333;">Cina (continente)</span></p>
<p><span>Marca</span>: <span style="color: #333;">NONE</span></p>
<p><span>Materiale</span>: <span style="color: #333;">Cotone,altro</span></p>
<p><span>Origine</span>: <span style="color: #333;">CN (Origine)</span></p>
<p><span>Prodotti chimici ad alto impatto</span>: <span style="color: #333;">Nessuno</span></p>
<p><span>Scena applicabile</span>: <span style="color: #333;">fare shopping</span></p>
<p><span>Se apertura completa</span>: <span style="color: #333;">Sì</span></p>
<p><span>Spessore</span>: <span style="color: #333;">Standard</span></p>
<p><span>Stagione applicabile</span>: <span style="color: #333;">Primavera e autunno</span></p>
<p><span>Stile</span>: <span style="color: #333;">Informale</span></p>
<p><span>Tipo di articolo</span>: <span style="color: #333;">Felpe Coordinati</span></p>
<p><span>Tipo di chiusura</span>: <span style="color: #333;">Cerniera</span></p>
<p><span>Tipo di chiusura dei pantaloni</span>: <span style="color: #333;">Coulisse</span></p>
<p><span>Tipo di motivo</span>: <span style="color: #333;">Stampa</span></p>
<p><span>size_info</span>: <span style="color: #333;">{"sizeInfoList":[{"length":{"cm":"100","inch":"39.37"},"size":"S","vid":100014064},{"length":{"cm":"105","inch":"41.34"},"size":"M","vid":361386},{"length":{"cm":"110","inch":"43.31"},"size":"L","vid":361385},{"length":{"cm":"115","inch":"45.28"},"size":"XL","vid":100014065},{"length":{"cm":"120","inch":"47.24"},"size":"XXL","vid":4182},{"length":{"cm":"125","inch":"49.21"},"size":"XXXL","vid":4183}]}</span></p>
<div class="detailmodule_html">
<div class="detail-desc-decorate-richtext">
<p><img src="https://ae01.alicdn.com/kf/S9987dd33850a46fda6ebc4d46eb83e78X.jpg"><img src="https://ae01.alicdn.com/kf/S771af73c67dd44eab23ea6b52bc25b34K.jpg"><img src="https://ae01.alicdn.com/kf/S0e1fed8615ea47bb9c4a9131354fcb8e2.jpg"><img src="https://ae01.alicdn.com/kf/Sb37fd1c7644f4ce280d04e9ebe0d6a59S.jpg"><img src="https://ae01.alicdn.com/kf/S3f15e83e11f94402ba93d1b05b113750W.jpg"><img src="https://ae01.alicdn.com/kf/S425b8cf5c7664067902455b6b6e97b4cJ.jpg"><img src="https://ae01.alicdn.com/kf/Sf959804d6d1c44e49232b4e5b9904b26k.jpg"><img src="https://ae01.alicdn.com/kf/Sdb2ac6d29b4349a3948628dc256da12dd.jpg"><img src="https://ae01.alicdn.com/kf/S08f06331ecc44b3b8380f0e07aa47867t.jpg"><img src="https://ae01.alicdn.com/kf/S8d2f8c1baa1347d784142120593091ec0.jpg"></p>
</div>
</div>
            `,
            }
        ),
      
       
        
      });
let res=await response.text()

      console.log("hello res im her",res);

      return Response.json({ improvedHtml: res });
    
}


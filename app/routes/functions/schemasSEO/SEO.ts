export const productSchema = (SEO,collections,OLD_DESC,offers,aggregateRating__,aggregateRating,review)=>{

    return{
        "@context": "https://schema.org/",

        "@graph": [
          {
            "@type": ["Organization", "Store"],
            "@id": "https://platinumshop.it/#organization",
            "name": "PlatiNum",
            "alternateName": "PlatiNum Shop",
            "url": "https://platinumshop.it",
            "logo": {
        "@type": "ImageObject",
        "url": "https://platinumshop.it/logo.png",
        "width": 512,
        "height": 512,
        "caption": "PlatiNum Logo"
      },
      "image": "https://platinumshop.it/logo.png",
      "description": "Gioielli artigianali in platino e oro - PlatiNum Shop Italia",
      "foundingDate": "2020",
          "founders": [
        {
          "@type": "Person",
          "name": "platinumshop"
        }
      ],
            "sameAs": [
              "https://facebook.com/platinumshop",
        "https://instagram.com/platinumshop",
        "https://twitter.com/platinumshop",
        "https://linkedin.com/company/platinumshop",
        "https://pinterest.com/platinumshop",
        "https://youtube.com/@platinumshop"
            ],
            "priceRange": "€€€",
            "paymentAccepted": ["Cash", "Credit Card", "PayPal", "Bank Transfer"],
            "currenciesAccepted": "EUR",


          },
          {
            "@type": "WebSite",
            "@id": "https://platinumshop.it/#website",
            "url": "https://platinumshop.it",
            "name": "PlatiNum - Gioielli in Platino",
            "publisher": {
              "@id": "https://platinumshop.it/#organization"
            },
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://platinumshop.it/search?q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            },
            "inLanguage": "it-IT"
          },


          {
            "@type": ["WebPage", "ItemPage"],
            "@id": `https://platinumshop.it/products/${SEO.handle}/#webpage`,
            "url": `https://platinumshop.it/products/${SEO.handle}`,
            "name": SEO.seoTitle || SEO.schemaOrg?.name,
            "description": SEO.seoDescription || OLD_DESC.title,
            "isPartOf": {
              "@id": "https://platinumshop.it/#website"
            },
            "primaryImageOfPage": {
              "@type": "ImageObject",
              "url": OLD_DESC.images?.[0]?.node?.image?.url || "",
              "width": 1200,
              "height": 800
            },
            "breadcrumb": {
              "@id": `https://platinumshop.it/products/${SEO.handle}/#breadcrumb`
            },
            "inLanguage": "it-IT",
            "datePublished": OLD_DESC.createdAt || new Date().toISOString(),
            "dateModified": OLD_DESC.updatedAt || new Date().toISOString()
          },


          {
            "@type": "BreadcrumbList",
            "@id": `https://platinumshop.it/products/${SEO.handle}/#breadcrumb`,
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://platinumshop.it"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": SEO.category?.name || "Products",
                "hasItem": collections.map((v:any)=>({
                  "@type": "Collections",
                  "sku":v.title,
                  "item": `https://platinumshop.it/collections/${v?.handle}`
                }))
                
               
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": SEO.schemaOrg?.name || SEO.seoTitle
              }
            ]
          },
          {
            "@type": ["Product", "IndividualProduct"],
            "@id": `https://platinumshop.it/products/${SEO.handle}#product`,

              "name": SEO?.schemaOrg.name || SEO.seoTitle,
              "description": SEO.seoDescription || OLD_DESC.title,
              // "image": OLD_DESC.images.map((e:any) => e.node.image.url) ,
              "image": OLD_DESC.images?.map((img, index) => ({
                "@type": "ImageObject",
                "url": img.node.image.url,
                "contentUrl": img.node.image.url,
                "width": img.node.image.width || 1200,
                "height": img.node.image.height || 800,
                "caption": img.node.altText || `${SEO.seoTitle} - Image ${index + 1}`,
                "representativeOfPage": index === 0
              })) || [],
              "sku": OLD_DESC?.title || OLD_DESC.id?.split('/').pop() || '',
              "mpn": OLD_DESC?.barcode || OLD_DESC.id?.split('/').pop() || '',
              "brand": { "@type": "Brand", "name": SEO?.schemaOrg.brand || "PlatiNum" },
              "manufacturer": {
                "@type": "Organization",
                "name": "PlatiNum Artigianato Italiano"
              },
              "hasVariant": OLD_DESC.sku.map((v:any) => ({
                     "@type": "Product",
                     "sku": v.node.inventoryItem.sku,
                     "offers": {
                     "@type": "Offer",
                     "price": Number(v.node.price) .toFixed(2) ,
                     "priceCurrency": OLD_DESC.currencyCode
                   }
                 })),
             "offers": {
            "@type": "Offer",
            "url": `https://platinumshop.it/products/${SEO.handle}`,
            "mainEntityOfPage": {
              "@id": `https://platinumshop.it/products/${SEO.handle}/#webpage`
            },
            // "priceCurrency": OLD_DESC.priceRangeV2.maxVariantPrice.currencyCode,
            "price": offers?offers: "0.00",
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "itemCondition": "https://schema.org/NewCondition",
             "availability": "https://schema.org/InStock",
  
            "seller": {
                    "@id": "https://platinumshop.it/#organization"
                  }
                },
               ... (aggregateRating && { aggregateRating__ }),

                ...(review && { review }),

                "hasMerchantReturnPolicy": {
                  "@type": "MerchantReturnPolicy",
                  "returnPolicyCategory": "https://schema.org/ReturnFeesCustomerResponsibility",
                  "merchantReturnDays": 14,
                  "returnMethod": "https://schema.org/ReturnByMail",
                  "inStoreReturnsOffered": true
                }
          },
          
        ],
      };
    }
      
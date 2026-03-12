export const productSchema = (SEO,collections,OLD_DESC,offers,aggregateRating__,aggregateRating,review)=>{

    return{
        "@context": "https://schema.org/",

        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://platinumshop.it/#organization",
            "name": "PlatiNum",
            "url": "https://platinumshop.it",
            "logo": "https://platinumshop.it/logo.png",
            "sameAs": [
              "https://facebook.com/platinumshop",
              "https://instagram.com/platinumshop"
            ]
          },
          {
            "@type": "BreadcrumbList",
            "@id": `https://platinumshop.it/products/${SEO.handle.trim()}/#breadcrumb`,
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
                  "item": `https://platinumshop.it/collections/${v?.handle.trim()}`
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
            "@type": "Product",
            "@id": `https://platinumshop.it/products/${SEO.handle.trim()}#product`,

              "name": SEO?.schemaOrg.name || SEO.seoTitle,
              "description": SEO.seoDescription || OLD_DESC.title,
              "image": OLD_DESC.images.map((e:any) => e.node.image.url) ,
              "sku": OLD_DESC?.title || OLD_DESC.id?.split('/').pop() || '',
              "mpn": OLD_DESC?.barcode || OLD_DESC.id?.split('/').pop() || '',
              "brand": { "@type": "Brand", "name": SEO?.schemaOrg.brand || "PlatiNum" },
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
            "url": `https://platinumshop.it/products/${SEO.handle.trim()}`,
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
      
import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';

// GraphQL ottimizzato: prendi solo ciò che serve per il mega menu
const MENU_QUERY = `
#graphql
  query MegaMenu($handle: String!) {
    menu(handle: $handle) {
      items {
        id
        title
        url
        items {
          id
          title
          url
          resource {
            ... on Collection {
              id
              handle
              image { url altText width height }
              products(first: 6) {
                nodes {
                  id
                  title
                  handle
                  featuredImage { url altText width height }
                  priceRange { minVariantPrice { amount currencyCode } }
                  compareAtPriceRange { minVariantPrice { amount currencyCode } }
                }
              }
            }
            ... on Product {
              id
              handle
              featuredImage { url altText width height }
              priceRange { minVariantPrice { amount currencyCode } }
            }
          }
          items {
            id
            title
            url
            resource {
              ... on Collection {
                id
                handle
                image { url altText width height }
              }
              ... on Product {
                id
                handle
                featuredImage { url altText width height }
              }
            }
          }
        }
      }
    }
  }
`;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const menuHandle = url.searchParams.get('menu') || 'main-menu';
    const parentIndex = parseInt(url.searchParams.get('parent') || '0', 10);

    // ─── 1. CLOUDFLARE EDGE CACHE ───
    const cache = (context.cloudflare.caches as any).default;
    const cacheKey = new Request(
        `${url.origin}/proxy/mega-menu?menu=${menuHandle}&parent=${parentIndex}`,
        { headers: request.headers }
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
        const data = await cached.json();
        return json(data, {
            headers: {
                'CF-Cache-Status': 'HIT',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                'CDN-Cache-Control': 'public, max-age=3600',
            },
        });
    }

    // ─── 2. FETCH DA SHOPIFY STOREFRONT API ───
    const { storefront } = context as any;
    const { menu } = await storefront.query(MENU_QUERY, {
        variables: { handle: menuHandle },
        cache: storefront.CacheLong(),
    });

    const parentLink = menu?.items?.[parentIndex];
    if (!parentLink) {
        return json({ error: 'Menu not found' }, { status: 404 });
    }

    // ─── 3. TRASFORMA & COMPRIMA I DATI ───
    // Flatten + ottimizza immagini via Cloudflare Image Resizing
    const optimizeImage = (shopifyUrl: string, width: number) => {
        if (!shopifyUrl) return shopifyUrl;
        if (shopifyUrl.includes('cdn.shopify.com')) {
            return shopifyUrl.replace(
                'https://cdn.shopify.com',
                `/cdn-cgi/image/width=${width},quality=75,format=auto,fit=cover`
            );
        }
        return shopifyUrl;
    };

    const payload = {
        menu: menuHandle,
        parentIndex,
        columns: parentLink.items?.map((child: any, cIdx: number) => ({
            index: cIdx + 1,
            title: child.title,
            url: child.url,
            categories: [
                // "Mostra tutto"
                {
                    id: `all-${child.id}`,
                    title: 'Mostra tutto',
                    url: child.url,
                    image: null,
                    isAll: true,
                },
                // Grandchildren
                ...(child.items?.map((grand: any) => {
                    const res = grand.resource;
                    const img = res?.image?.url || res?.featuredImage?.url;
                    return {
                        id: grand.id,
                        handle: res?.handle || grand.handle,
                        title: grand.title,
                        url: grand.url,
                        image: img ? {
                            src: optimizeImage(img, 400),
                            srcset: `${optimizeImage(img, 200)} 200w, ${optimizeImage(img, 400)} 400w, ${optimizeImage(img, 600)} 600w`,
                            sizes: '100px',
                            alt: res?.image?.altText || res?.featuredImage?.altText || grand.title,
                        } : null,
                        // Prodotti o link figli
                        products: res?.products?.nodes?.map((p: any) => ({
                            id: p.id,
                            title: p.title,
                            handle: p.handle,
                            url: `/products/${p.handle}`,
                            image: p.featuredImage ? {
                                src: optimizeImage(p.featuredImage.url, 600),
                                srcset: `${optimizeImage(p.featuredImage.url, 300)} 300w, ${optimizeImage(p.featuredImage.url, 600)} 600w`,
                                sizes: '130px',
                                alt: p.featuredImage.altText || p.title,
                            } : null,
                            price: p.priceRange?.minVariantPrice?.amount,
                            currency: p.priceRange?.minVariantPrice?.currencyCode,
                            compareAtPrice: p.compareAtPriceRange?.minVariantPrice?.amount,
                        })) || grand.items?.slice(0, 6).map((gg: any) => ({
                            id: gg.id,
                            title: gg.title,
                            url: gg.url,
                            image: gg.resource?.featuredImage || gg.resource?.image ? {
                                src: optimizeImage((gg.resource.featuredImage || gg.resource.image).url, 300),
                                srcset: `${optimizeImage((gg.resource.featuredImage || gg.resource.image).url, 150)} 150w, ${optimizeImage((gg.resource.featuredImage || gg.resource.image).url, 300)} 300w`,
                                sizes: '130px',
                                alt: (gg.resource.featuredImage || gg.resource.image).altText || gg.title,
                            } : null,
                        })) || [],
                    };
                }) || []),
            ],
        })) || [],
    };

    // ─── 4. SALVA IN CACHE CLOUDFLARE ───
    const responseBody = JSON.stringify(payload);
    (context as any).waitUntil(
        cache.put(
            cacheKey,
            new Response(responseBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                },
            })
        )
    );

    return json(payload, {
        headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'public, max-age=3600',
            'Vary': 'Accept-Encoding',
        },
    });
}
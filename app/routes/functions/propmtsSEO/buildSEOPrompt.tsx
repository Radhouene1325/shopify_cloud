import { sendPrompt } from "../deepseekai/deepseekai";

// Add this new function alongside your existing generateSeoHtml
export async function generateSeoMetadata(
    products: { id: string; title: string; description: string; handle?: string; vendor?: string,image?:string,productType?:string }[],
    apiKey: string
  ): Promise<{ id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType?:string,category:string,categoryId:string }[]> {
    const CHUNK_SIZE = 10;
    const chunks = [];
    
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      chunks.push(products.slice(i, i + CHUNK_SIZE));
    }
  
    const allResults: { id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType:string,categoryId:string,category:string }[] = [];
  
    const chunkPromises = chunks.map(async (chunk, idx) => {
      const seoPrompt = buildSEOPrompt(chunk);
  
      try {
        const seoResults = await sendPrompt(seoPrompt, apiKey) as { id: string; seoTitle: string; seoDescription: string; handle: string,image:string,productType:string,category:string,categoryId:string }[];
        
        if (!Array.isArray(seoResults)) {
          throw new Error(`Chunk ${idx + 1} returned invalid SEO format`);
        }
  
        // Validate results
        seoResults.forEach(item => {
          if (item.seoTitle.length > 60) {
            console.warn(`⚠️ SEO title too long for ${item.id}: ${item.seoTitle.length} chars`);
          }
          if (item.seoDescription.length > 160) {
            console.warn(`⚠️ SEO description too long for ${item.id}: ${item.seoDescription.length} chars`);
          }
          if (!/^[a-z0-9-]+$/.test(item.handle)) {
            console.warn(`⚠️ Invalid handle format for ${item.id}: ${item.handle}`);
          }
        });
  // console.log('resulted is her hello',seoResults)
  // console.log('resulted is her hello',seoResults.map(e=>e?.schemaOrg.offers))

        return seoResults;
      } catch (err) {
        console.error(`Error processing SEO chunk ${idx + 1}:`, err);
        throw err;
      }
    });
  
    const results = await Promise.all(chunkPromises);
    results.forEach(r => allResults.push(...r));
  
    return allResults;
  }
  








  export async function getTaxonomyIdForCategory(
    admin: any,
    category: string
  ): Promise<string | null> {
    
    try {
      console.log(`🔍 Searching for category: "${category}"`);
      
      // Search with pagination
      const results = await searchTaxonomyCategory(admin, category, 500);
      console.log('her rsult of the tamoxy is her ',results)
      if (results.categories.length === 0) {
        console.warn(`⚠️ No taxonomy found for: "${category}"`);
        return null;
      }
  
      // Find best match
      let bestMatch = results.categories[0];
      
      for (const edge of results.categories) {
        const node = edge.name;
        
        // Prefer exact name match
        if (node.toLowerCase() === category.toLowerCase()) {
          bestMatch = edge;
          break;
        }
        
        // Prefer leaf categories (actual product categories)
        if (node?.isLeaf && !bestMatch.node.productTaxonomyNode.isLeaf) {
          bestMatch = edge;
        }
      }
  
      const taxonomy = bestMatch;
      console.log(`✅ Found: ${taxonomy.fullName}`);
      console.log(`   ID: ${taxonomy.id}`);
      
      return taxonomy.id;
  
    } catch (error) {
      console.error(`❌ Error finding taxonomy for "${category}":`, error);
      return null;
    }
  }
  


interface GraphQLAdmin {
    graphql: (query: string, options?: { variables?: Record<string, any> }) => Promise<Response>;
  }
  
  interface TaxonomyValue {
    id: string;
    name: string;
    taxonomyId: string;
  }
  
  interface TaxonomyAttribute {
    id: string;
    name: string;
    taxonomyId: string;
    type: 'choice' | 'measurement' | 'unknown';
    values?: TaxonomyValue[];
    options?: Array<{ key: string; value: string }>;
  }
  
  interface TaxonomyCategory {
    id: string;
    name: string;
    fullName: string;
    ancestorIds: string[];
    childrenIds: string[];
    isLeaf: boolean;
    isRoot?: boolean;
    isArchived?: boolean;
    level: number;
    parentId?: string;
    taxonomyId: string;
    attributes: TaxonomyAttribute[];
  }
  
  interface SearchOptions {
    maxResults?: number;
    pageSize?: number;
    fetchAttributes?: boolean;
    attributesFirst?: number;
    valuesFirst?: number;
    attributeTypes?: ('choice' | 'measurement')[];
    concurrency?: number;
  }
  
  interface SearchResult {
    success: boolean;
    categories: TaxonomyCategory[];
    totalFound: number;
    searchTerm: string;
    executionTimeMs: number;
    hasMore: boolean;
  }
  
  // ============================================================================
  // SEARCH UTILITIES
  // ============================================================================
  
  class SearchSanitizer {
    /**
     * Sanitize search term for Shopify GraphQL search
     * Handles special characters like &, |, !, etc.
     */
    static sanitize(searchTerm: string): string {
      if (!searchTerm) return '';
      
      let sanitized = searchTerm.trim();
      
      // Replace & with escaped version or space
      sanitized = sanitized.replace(/&/g, '\\&');
      sanitized = sanitized.replace(/\|/g, '\\|');
      sanitized = sanitized.replace(/!/g, '\\!');
      sanitized = sanitized.replace(/:/g, '\\:');
      sanitized = sanitized.replace(/\(/g, '\\(');
      sanitized = sanitized.replace(/\)/g, '\\)');
      
      return sanitized;
    }
  
    /**
     * Alternative: Prepare search term for partial matching
     */
    static prepareForSearch(searchTerm: string): string {
      if (!searchTerm) return '';
      
      return searchTerm
        .trim()
        .replace(/&/g, ' ')
        .replace(/\|/g, ' ')
        .replace(/!/g, ' ')
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  
    /**
     * Create multiple search variations for better matching
     */
    static createSearchVariations(searchTerm: string): string[] {
      const variations: string[] = [];
      
      // Original (sanitized)
      variations.push(this.sanitize(searchTerm));
      
      // Without special chars
      variations.push(this.prepareForSearch(searchTerm));
      
      // Just the first word
      const firstWord = searchTerm.split(/[\s&|]/)[0];
      if (firstWord && firstWord !== searchTerm) {
        variations.push(firstWord);
      }
      
      return [...new Set(variations)];
    }
  }
  
  // ============================================================================
  // CACHE
  // ============================================================================
  
  class TTLCache<K, V> {
    private cache = new Map<K, { value: V; expires: number }>();
    
    constructor(
      private maxSize = 1000,
      private defaultTTL = 1000 * 60 * 60 * 2
    ) {}
  
    get(key: K): V | undefined {
      const entry = this.cache.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expires) {
        this.cache.delete(key);
        return undefined;
      }
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.value;
    }
  
    set(key: K, value: V, ttl?: number): void {
      if (this.cache.has(key)) this.cache.delete(key);
      const expires = Date.now() + (ttl ?? this.defaultTTL);
      this.cache.set(key, { value, expires });
      if (this.cache.size > this.maxSize) {
        const first = this.cache.keys().next().value;
        this.cache.delete(first);
      }
    }
  }
  
  // ============================================================================
  // GRAPHQL CLIENT
  // ============================================================================
  
  class GraphQLExecutor {
    constructor(
      private admin: GraphQLAdmin,
      private retries = 3,
      private baseDelay = 300
    ) {}
  
    async execute<T = any>(
      query: string,
      variables: Record<string, any>,
      operationName?: string
    ): Promise<T> {
      try {
        return await this.executeWithRetry(query, variables, operationName);
      } catch (error) {
        throw error;
      }
    }
  
    private async executeWithRetry(
      query: string,
      variables: Record<string, any>,
      operationName?: string,
      retriesLeft = this.retries
    ): Promise<any> {
      try {
        const response = await this.admin.graphql(query, { variables });
        console.log('response is her 1',response)
        const json = await response.json();
  
        if (json.errors?.length) {
          throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
        }
  
        // Rate limit handling
        const cost = json?.extensions?.cost;
        if (cost?.throttleStatus?.currentlyAvailable < 100) {
          await this.sleep(500);
        }
  
        return json.data;
      } catch (error) {
        if (retriesLeft <= 0) throw error;
        const delay = this.baseDelay * Math.pow(2, this.retries - retriesLeft);
        await this.sleep(delay);
        return this.executeWithRetry(query, variables, operationName, retriesLeft - 1);
      }
    }
  
    private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // ============================================================================
  // CONCURRENCY POOL
  // ============================================================================
  
  class ConcurrencyPool {
    private queue: Array<() => Promise<void>> = [];
    private active = 0;
  
    constructor(private limit: number) {}
  
    async execute<T>(task: () => Promise<T>): Promise<T> {
      if (this.active >= this.limit) {
        await new Promise<void>(resolve => this.queue.push(resolve));
      }
  
      this.active++;
      try {
        return await task();
      } finally {
        this.active--;
        const next = this.queue.shift();
        if (next) next();
      }
    }
  
    async map<T, R>(items: T[], mapper: (item: T) => Promise<R>): Promise<R[]> {
      const results = new Array<R>(items.length);
      await Promise.all(
        items.map((item, index) => 
          this.execute(async () => {
            results[index] = await mapper(item);
          })
        )
      );
      return results;
    }
  }
  
  // ============================================================================
  // TAXONOMY REPOSITORY
  // ============================================================================
  
  class TaxonomyRepository {
    private client: GraphQLExecutor;
    private valuesCache: TTLCache<string, TaxonomyValue[]>;
    private pool: ConcurrencyPool;
  
    constructor(admin: GraphQLAdmin, concurrency = 5) {
      this.client = new GraphQLExecutor(admin);
      this.valuesCache = new TTLCache();
      this.pool = new ConcurrencyPool(concurrency);
    }
  
    // ==========================================================================
    // GET ATTRIBUTE VALUES
    // ==========================================================================
  
    async getAttributeValues(
      attributeId: string,
      first = 250
    ): Promise<TaxonomyValue[]> {
      const cached = this.valuesCache.get(attributeId);
      if (cached) return cached;
  
      const query = `#graphql
        query GetAttributeValues($id: ID!, $first: Int!, $after: String) {
          node(id: $id) {
            ... on TaxonomyChoiceListAttribute {
              id
              name
              values(first: $first, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;
  
      const values: TaxonomyValue[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
  
      while (hasNextPage) {
        const data = await this.client.execute(
          query,
          { id: attributeId, first, after: cursor },
          `GetValues-${attributeId}`
        );
  
        const node = data?.node;
        if (!node?.values) break;
  
        const pageValues = node.values.edges.map((e: any) => ({
          id: e.node.id,
          name: e.node.name,
          taxonomyId: e.node.id
        }));
  
        values.push(...pageValues);
        hasNextPage = node.values.pageInfo.hasNextPage;
        cursor = node.values.pageInfo.endCursor;
      }
  
      this.valuesCache.set(attributeId, values);
      return values;
    }
  
    // ==========================================================================
    // GET CATEGORY ATTRIBUTES
    // ==========================================================================
  
    async getCategoryAttributes(
      categoryId: string,
      options: {
        first?: number;
        valuesFirst?: number;
        types?: ('choice' | 'measurement')[];
      } = {}
    ): Promise<TaxonomyAttribute[]> {
      const { first = 100, valuesFirst = 250, types } = options;
  
      const query = `#graphql
        query GetCategoryAttributes($id: ID!, $first: Int!, $after: String) {
          node(id: $id) {
            ... on TaxonomyCategory {
              id
              attributes(first: $first, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    __typename
                    ... on TaxonomyChoiceListAttribute {
                      id
                      name
                    }
                    ... on TaxonomyMeasurementAttribute {
                      id
                      name
                      options {
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
  
      const attributes: TaxonomyAttribute[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
  
      while (hasNextPage) {
        const data = await this.client.execute(
          query,
          { id: categoryId, first, after: cursor },
          `GetAttributes-${categoryId}`
        );
  
        const node = data?.node;
        if (!node?.attributes) break;
  
        const batch = node.attributes.edges.map((e: any) => {
          const node = e.node;
          const typeMap: Record<string, TaxonomyAttribute['type']> = {
            'TaxonomyChoiceListAttribute': 'choice',
            'TaxonomyMeasurementAttribute': 'measurement'
          };
  
          return {
            id: node.id,
            name: node.name,
            taxonomyId: node.id,
            type: typeMap[node.__typename] || 'unknown',
            ...(node.options && { options: node.options })
          } as TaxonomyAttribute;
        });
  
        const filteredBatch = types ? batch.filter(a => types.includes(a.type)) : batch;
  
        // Fetch values for choice attributes
        const choiceAttrs = filteredBatch.filter(a => a.type === 'choice');
        if (choiceAttrs.length > 0) {
          await Promise.all(
            choiceAttrs.map(async (attr) => {
              try {
                attr.values = await this.getAttributeValues(attr.id, valuesFirst);
              } catch (error) {
                attr.values = [];
              }
            })
          );
        }
  
        attributes.push(...filteredBatch);
        hasNextPage = node.attributes.pageInfo.hasNextPage;
        cursor = node.attributes.pageInfo.endCursor;
      }
  
      return attributes;
    }
  
    // ==========================================================================
    // SEARCH - FIXED VERSION
    // ==========================================================================
  
    async search(
      searchTerm: string,
      options: SearchOptions = {}
    ): Promise<SearchResult> {
      const startTime = Date.now();
  
      const config = {
        maxResults: options.maxResults ?? 250,
        pageSize: options.pageSize ?? 50,
        fetchAttributes: options.fetchAttributes ?? true,
        attributesFirst: options.attributesFirst ?? 100,
        valuesFirst: options.valuesFirst ?? 250,
        attributeTypes: options.attributeTypes,
        concurrency: options.concurrency ?? 5
      };
  
      // Try multiple search strategies
      const searchVariations = SearchSanitizer.createSearchVariations(searchTerm);
      let allCategories: TaxonomyCategory[] = [];
      
      console.log(`🔍 Searching for: "${searchTerm}"`);
      console.log(`   Trying variations:`, searchVariations);
  
      for (const variation of searchVariations) {
        if (allCategories.length > 0) break;
        
        try {
          const categories = await this.executeSearch(variation, config);
          allCategories = categories;
        } catch (error) {
          console.error(`   Search error for "${variation}":`, (error as Error).message);
        }
      }
  
      // If still no results, try hierarchical search
      if (allCategories.length === 0) {
        console.log(`   ⚠️ No direct matches, trying hierarchical search...`);
        allCategories = await this.hierarchicalSearch(searchTerm, config);
      }
  
      // Enrich with attributes
      if (config.fetchAttributes && allCategories.length > 0) {
        console.log(`   📦 Enriching ${allCategories.length} categories with attributes...`);
        
        const enriched = await this.pool.map(
          allCategories,
          async (category) => {
            try {
              const attrs = await this.getCategoryAttributes(category.id, {
                first: config.attributesFirst,
                valuesFirst: config.valuesFirst,
                types: config.attributeTypes
              });
              category.attributes = attrs;
              return category;
            } catch (error) {
              category.attributes = [];
              return category;
            }
          }
        );
      }
  
      return {
        success: allCategories.length > 0,
        categories: allCategories.slice(0, config.maxResults),
        totalFound: allCategories.length,
        searchTerm,
        executionTimeMs: Date.now() - startTime,
        hasMore: false
      };
    }
  
    // ==========================================================================
    // EXECUTE SEARCH QUERY - FIXED (NO handle FIELD)
    // ==========================================================================
  
    private async executeSearch(
      searchTerm: string,
      config: any
    ): Promise<TaxonomyCategory[]> {
      // FIXED: Removed 'handle' field which doesn't exist on TaxonomyCategory
      const query = `#graphql
        query SearchTaxonomyCategories($search: String!, $first: Int!, $after: String) {
          taxonomy {
            categories(first: $first, search: $search, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  name
                  fullName
                  ancestorIds
                  childrenIds
                  isLeaf
                  isRoot
                  isArchived
                  level
                  parentId
                }
              }
            }
          }
        }
      `;
  
      const categories: TaxonomyCategory[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
  
      while (hasNextPage && categories.length < config.maxResults) {
        const remaining = config.maxResults - categories.length;
        const fetchSize = Math.min(config.pageSize, remaining);
  
        try {
        //   const data = await this.client.execute(
        //     query,
        //     { search: searchTerm, first: fetchSize, after: cursor },
        //     `Search-${searchTerm}`
        //   );
        const safeSearch = SearchSanitizer.prepareForSearch(searchTerm);

const data = await this.client.execute(
  query,
  { search: safeSearch, first: fetchSize, after: cursor },
  `Search-${safeSearch}`
);
  
          const conn = data?.taxonomy?.categories;
          if (!conn) break;
  
          const batch = conn.edges.map((e: any) => this.buildCategory(e.node));
          categories.push(...batch);
  
          hasNextPage = conn.pageInfo.hasNextPage;
          cursor = conn.pageInfo.endCursor;
        } catch (error) {
          console.error(`   Search execution error:`, (error as Error).message);
          break;
        }
      }
  
      return categories;
    }
  
    // ==========================================================================
    // HIERARCHICAL SEARCH - FIXED
    // ==========================================================================
  
    private async hierarchicalSearch(
      searchTerm: string,
      config: any
    ): Promise<TaxonomyCategory[]> {
      const parentTerms = ['Apparel & Accessories', 'Clothing', 'Men', 'Women', 'Hoodies'];
      const results: TaxonomyCategory[] = [];
      
      for (const parentTerm of parentTerms) {
        if (results.length > 0) break;
        
        try {
          // Get parent category
          const parentQuery = `#graphql
            query SearchParent($search: String!) {
              taxonomy {
                categories(first: 10, search: $search) {
                  edges {
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          `;
          
          const parentData = await this.client.execute(
            parentQuery,
            { search: parentTerm },
            `FindParent-${parentTerm}`
          );
          
          const parents = parentData?.taxonomy?.categories?.edges || [];
          
          // Search children of each parent
          for (const parent of parents) {
            const childrenQuery = `#graphql
              query GetChildren($id: ID!) {
                taxonomy {
                  categories(first: 100, children_of: $id) {
                    edges {
                      node {
                        id
                        name
                        fullName
                        ancestorIds
                        childrenIds
                        isLeaf
                        isRoot
                        isArchived
                        level
                        parentId
                      }
                    }
                  }
                }
              }
            `;
            
            const childrenData = await this.client.execute(
              childrenQuery,
              { id: parent.node.id },
              `SearchChildren-${parent.node.id}`
            );
            
            const children = childrenData?.taxonomy?.categories?.edges || [];
            
            // Filter manually for better matching
            const searchWords = searchTerm.toLowerCase().split(/[\s&]+/).filter(w => w.length > 0);
            
            const matching = children.filter((e: any) => {
              const name = e.node.name.toLowerCase();
              const fullName = e.node.fullName.toLowerCase();
              return searchWords.some(word => 
                name.includes(word) || fullName.includes(word)
              );
            });
            
            if (matching.length > 0) {
              results.push(...matching.map((e: any) => this.buildCategory(e.node)));
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      return results;
    }
  
    private buildCategory(node: any): TaxonomyCategory {
      return {
        id: node.id,
        name: node.name,
        fullName: node.fullName,
        ancestorIds: node.ancestorIds || [],
        childrenIds: node.childrenIds || [],
        isLeaf: node.isLeaf,
        isRoot: node.isRoot,
        isArchived: node.isArchived,
        level: node.level || (node.ancestorIds?.length || 0),
        parentId: node.parentId || node.ancestorIds?.[node.ancestorIds.length - 1],
        taxonomyId: node.id,
        attributes: [],
        path: node.fullName?.split(' > ') || [node.name]
      };
    }
  }
  
  // ============================================================================
  // EXPORT FUNCTIONS
  // ============================================================================
  
  let repository: TaxonomyRepository | null = null;
  
  function getRepository(admin: GraphQLAdmin): TaxonomyRepository {
    if (!repository) {
      repository = new TaxonomyRepository(admin);
    }
    return repository;
  }
  
  export async function searchTaxonomyAdvanced(
    admin: GraphQLAdmin,
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const repo = getRepository(admin);
    return repo.search(searchTerm, options);
  }
  
  export async function searchTaxonomyCategory(
    admin: GraphQLAdmin,
    searchTerm: string,
    maxResults?: number,
    pageSize?: number,
    attributesFirst?: number,
    valuesFirst?: number
  ): Promise<SearchResult> {
    return searchTaxonomyAdvanced(admin, searchTerm, {
      maxResults,
      pageSize,
      attributesFirst,
      valuesFirst,
      fetchAttributes: true
    });
  }
  
  // Type exports
  export type {
    TaxonomyCategory,
    TaxonomyAttribute,
    TaxonomyValue,
    SearchResult,
    SearchOptions,
    GraphQLAdmin
  };











  function buildSEOPrompt(
    chunk: { 
      id: string; 
      title: string; 
      description: string; 
      handle?: string; 
      vendor?: string;
      image?: string;
      productType?: string;
      tags?: string[];
      price?: number;
    }[]
  ): string {
    return `You are a Multi-Platform SEO API specializing in Shopify Standard Product Taxonomy (2026-02) with optimization for Google Search, Brave Search, Facebook Shop, TikTok Shop, and Pinterest.
  
  STRICT OUTPUT FORMAT - JSON Array Only:
  [{
    "id": "gid://shopify/Product/xxxxx",
    "seoTitle": "50-60 chars, keyword-first, emotional trigger",
    "seoDescription": "150-160 chars, benefit-driven, urgency/CTA",
    "handle": "seo-friendly-url-slug",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/xx-x-x-x",
      "name": "Human-readable category name",
      "breadcrumb": "Parent > Child > Leaf"
    },
    "productType": "Specific leaf node name",
    "attributes": {
      "color": "extracted or null",
      "material": "extracted or null",
      "targetGender": "extracted or null",
      "size": "extracted or null",
      "pattern": "extracted or null"
    },
    "socialOptimization": {
      "facebookTitle": "80-100 chars, engagement focused",
      "facebookDescription": "200-300 chars, social proof, emojis allowed",
      "tiktokTitle": "100-150 chars, hashtag-friendly, trend-aware",
      "pinterestTitle": "100-500 chars, descriptive, keyword-rich",
      "pinterestDescription": "500 chars max, SEO keywords, call to action"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Product name",
      "description": "SEO description",
      "brand": "Brand name",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock "
      }
    }
  }]
  
  ═══════════════════════════════════════════════════════════════
  MULTI-PLATFORM SEO STRATEGY (2026 Standards)
  ═══════════════════════════════════════════════════════════════
  
  GOOGLE SEARCH (Primary - 90% traffic):
  • Title: 50-60 chars, primary keyword FIRST, year/modifier [2026]
  • Description: 150-160 chars, emotional trigger, clear CTA
  • Focus: Search intent matching, featured snippets, rich results
  
  BRAVE SEARCH (Privacy-focused):
  • Title: Same as Google
  • Description: Fact-focused, less promotional
  
  FACEBOOK SHOP (Social commerce):
  • Title: 80-100 chars, social proof, emotional connection
  • Description: 200-300 chars, lifestyle focus, benefits over features
  
  TIKTOK SHOP (Video-commerce):
  • Title: 100-150 chars, hashtag-friendly, trend-jacking
  • Description: Short, punchy, video-context aware
  
  PINTEREST (Visual search engine):
  • Title: 100-500 chars, highly descriptive, keyword-stuffed naturally
  • Description: 500 chars max, solution-oriented, DIY/inspiration focus
  
  ═══════════════════════════════════════════════════════════════
  SHOPIFY TAXONOMY 2026-02 - EXACT CATEGORY MAPPING
  ═══════════════════════════════════════════════════════════════
  
  CRITICAL: Analyze product title, description, AND image to determine the EXACT leaf node category.
  The category.id MUST match Shopify's official taxonomy exactly as shown in the examples below.
  
  FORMAT: gid://shopify/TaxonomyCategory/[vertical]-[level1]-[level2]-[level3]-[level4]
  
  VERTICAL CODES:
  aa = Apparel & Accessories | ae = Arts & Entertainment | bt = Baby & Toddler
  bi = Business & Industrial | el = Electronics | fb = Food, Beverages & Tobacco
  hb = Health & Beauty | hg = Home & Garden | lb = Luggage & Bags
  sg = Sporting Goods | tg = Toys & Games | vp = Vehicles & Parts
  an = Animals & Pet Supplies | fa = Furniture | hl = Hardware
  me = Media | sw = Software
  
  ═══════════════════════════════════════════════════════════════
  COMPLETE E-COMMERCE TAXONOMY REFERENCE (2026-02)
  ═══════════════════════════════════════════════════════════════
  
  APPAREL & ACCESSORIES (aa) - COMPLETE
  ├── Clothing (aa-1)
  │   ├── Activewear (aa-1-1)
  │   │   ├── aa-1-1-1: Activewear Pants (Joggers, Leggings, Shorts, Sweatpants, Tights, Track Pants, Wind Pants, Training Pants)
  │   │   ├── aa-1-1-2: Activewear Tops (Crop Tops, T-Shirts, Tank Tops)
  │   │   ├── aa-1-1-4: Boxing Shorts
  │   │   ├── aa-1-1-5: Dance Dresses, Skirts & Costumes
  │   │   ├── aa-1-1-6: Sports Bras
  │   │   └── aa-1-1-8: Activewear Vests & Jackets (Jackets, Vests)
  │   │
  │   ├── Baby & Children's Clothing (aa-1-2) [BAMBINI 0-16 ANNI - 2026 UPDATE]
  │   │   ├── aa-1-2-1: Baby & Children's Bottoms (Cargos, Chinos, Jeans, Jeggings, Joggers, Leggings, Shorts, Skirts, Skorts, Sweatpants, Trousers)
  │   │   ├── aa-1-2-2: Baby & Children's Diaper Covers
  │   │   ├── aa-1-2-3: Baby & Children's Dresses
  │   │   ├── aa-1-2-4: Baby & Children's Outerwear
  │   │   │   └── aa-1-2-4-17: Baby & Children's Coats & Jackets (Bolero, Bomber, Capes, Motorcycle, Overcoats, Parkas, Pea Coats, Ponchos, Puffer, Rain Coats, Sport, Track, Trench, Trucker, Windbreakers, Wrap Coats)
  │   │   ├── aa-1-2-4-18: Baby & Children's Snow Pants & Suits
  │   │   ├── aa-1-2-5: Baby & Children's Outfits
  │   │   ├── aa-1-2-6: Baby & Children's Sleepwear
  │   │   ├── aa-1-2-7: Baby & Children's Socks & Tights
  │   │   ├── aa-1-2-8: Baby & Children's Swimwear (Burkinis, Classic Bikinis, Cover Ups, One-Piece, Swim Boxers, Swim Briefs, Swim Dresses, Swim Jammers, Swim Trunks, Swimwear Tops)
  │   │   ├── aa-1-2-9: Baby & Children's Tops (Bodysuits, Cardigans, Hoodies, Overshirts, Polos, Shirts, Sweaters, Sweatshirts, T-Shirts, Tunics)
  │   │   ├── aa-1-2-10: Baby One-Pieces
  │   │   └── aa-1-2-11: Toddler Underwear (Boxer Briefs, Boxers, Briefs, Panties, Training Pants)
  │   │
  │   ├── Boys' Underwear (aa-1-3)
  │   │   ├── aa-1-3-1: Boys' Long Johns
  │   │   ├── aa-1-3-2: Boys' Underpants (Boxer Briefs, Boxer Shorts, Briefs, Midway Briefs, Trunks)
  │   │   └── aa-1-3-3: Boys' Undershirts
  │   │
  │   ├── Dresses (aa-1-4) [DONNA]
  │   │
  │   ├── Girls' Underwear (aa-1-5) [BAMBINI/RAGAZZE]
  │   │   ├── aa-1-5-1: Girls' Long Johns
  │   │   ├── aa-1-5-2: Girls' Underpants (Bikinis, Boxer Briefs, Boyshorts, Briefs, Hipsters, Panties, Period Underwear, Thongs)
  │   │   └── aa-1-5-3: Girls' Undershirts (First Bras)
  │   │
  │   ├── Lingerie (aa-1-6) [DONNA INTIMO]
  │   │   ├── aa-1-6-1: Bodysuits
  │   │   ├── aa-1-6-2: Bra Accessories (Strap Pads, Straps & Extenders, Breast Enhancing Inserts, Petals & Concealers)
  │   │   ├── aa-1-6-3: Bras
  │   │   ├── aa-1-6-4: Camisoles
  │   │   ├── aa-1-6-6: Hosiery
  │   │   ├── aa-1-6-7: Jock Straps
  │   │   ├── aa-1-6-8: Lingerie Accessories (Garter Belts, Garters, Pantyhose)
  │   │   ├── aa-1-6-9: Petticoats & Pettipants
  │   │   ├── aa-1-6-10: Shapewear (Bodysuits, Full Body Shapes, High Waisted Briefs, Thigh Slimmers, Waist Cinchers)
  │   │   ├── aa-1-6-11: Women's Underpants (Bikinis, Boyshorts, Briefs, G-Strings, Period Underwear, Thongs)
  │   │   ├── aa-1-6-12: Women's Undershirts
  │   │   └── aa-1-6-13: Women's Underwear Slips
  │   │
  │   ├── Maternity Clothing (aa-1-7) [DONNA GRAVIDANZA]
  │   │   ├── aa-1-7-1: Nursing Bras
  │   │   ├── aa-1-7-2: Maternity Dresses
  │   │   ├── aa-1-7-3: Maternity One-Pieces
  │   │   ├── aa-1-7-4: Maternity Pants (Cargos, Chinos, Jeans, Jeggings, Joggers, Leggings, Shorts, Skorts, Trousers)
  │   │   ├── aa-1-7-5: Maternity Skirts
  │   │   ├── aa-1-7-6: Maternity Sleepwear
  │   │   ├── aa-1-7-7: Maternity Swimwear (Burkinis, Classic Bikinis, Cover Ups, One-Piece, Swim Boxers, Swim Dresses, Swimwear Tops)
  │   │   └── aa-1-7-8: Maternity Tops (Blouses, Bodysuits, Cardigans, Nursing Shirts, Overshirts, Shirts, T-Shirts, Tunics)
  │   │
  │   ├── Men's Undergarments (aa-1-8)
  │   │   ├── aa-1-8-1: Men's Long Johns
  │   │   ├── aa-1-8-2: Men's Undershirts
  │   │   └── aa-1-8-3: Men's Underwear (Boxer Briefs, Boxer Shorts, Briefs, Jockstraps, Midway Briefs, Thongs, Trunks, Undershorts)
  │   │
  │   ├── One-Pieces (aa-1-9)
  │   │
  │   ├── Outerwear (aa-1-10)
  │   │   ├── aa-1-10-1: Chaps
  │   │   ├── aa-1-10-2: Coats & Jackets
  │   │   │   ├── aa-1-10-2-1: Bolero Jackets
  │   │   │   ├── aa-1-10-2-2: Bomber Jackets
  │   │   │   ├── aa-1-10-2-3: Capes
  │   │   │   ├── aa-1-10-2-5: Overcoats
  │   │   │   ├── aa-1-10-2-6: Parkas
  │   │   │   ├── aa-1-10-2-7: Pea Coats
  │   │   │   ├── aa-1-10-2-8: Ponchos
  │   │   │   ├── aa-1-10-2-9: Puffer Jackets
  │   │   │   ├── aa-1-10-2-10: Rain Coats
  │   │   │   ├── aa-1-10-2-11: Sport Jackets
  │   │   │   ├── aa-1-10-2-12: Track Jackets
  │   │   │   ├── aa-1-10-2-13: Trench Coats
  │   │   │   ├── aa-1-10-2-14: Trucker Jackets
  │   │   │   ├── aa-1-10-2-15: Varsity Jackets
  │   │   │   ├── aa-1-10-2-16: Windbreakers
  │   │   │   └── aa-1-10-2-17: Wrap Coats
  │   │   ├── aa-1-10-3: Rain Pants
  │   │   ├── aa-1-10-4: Rain Suits
  │   │   ├── aa-1-10-5: Snow Pants & Suits
  │   │   ├── aa-1-10-6: Vests
  │   │   └── aa-1-10-7: Motorcycle Outerwear
  │   │
  │   ├── Outfit Sets (aa-1-11)
  │   ├── Pants (aa-1-12)
  │   │   ├── aa-1-12-2: Cargo Pants
  │   │   ├── aa-1-12-3: Chinos
  │   │   ├── aa-1-12-4: Jeans
  │   │   ├── aa-1-12-5: Jeggings
  │   │   ├── aa-1-12-7: Joggers
  │   │   ├── aa-1-12-8: Leggings
  │   │   └── aa-1-12-11: Trousers
  │   │
  │   ├── Clothing Tops (aa-1-13)
  │   │   ├── aa-1-13-1: Blouses [DONNA]
  │   │   ├── aa-1-13-2: Bodysuits
  │   │   ├── aa-1-13-3: Cardigans
  │   │   ├── aa-1-13-5: Overshirts
  │   │   ├── aa-1-13-6: Polos
  │   │   ├── aa-1-13-7: Shirts
  │   │   ├── aa-1-13-8: T-Shirts
  │   │   ├── aa-1-13-9: Tank Tops
  │   │   ├── aa-1-13-11: Tunics
  │   │   ├── aa-1-13-12: Sweaters
  │   │   ├── aa-1-13-13: Hoodies
  │   │   └── aa-1-13-14: Sweatshirts
  │   │
  │   ├── Shorts (aa-1-14)
  │   │   ├── aa-1-14-1: Bermudas
  │   │   ├── aa-1-14-2: Cargo Shorts
  │   │   ├── aa-1-14-3: Chino Shorts
  │   │   └── aa-1-14-5: Denim Shorts
  │   │
  │   ├── Skirts (aa-1-15) [DONNA]
  │   │
  │   ├── Sleepwear & Loungewear (aa-1-17)
  │   │   ├── aa-1-17-2: Loungewear
  │   │   │   ├── aa-1-17-2-1: Loungewear Bottoms (Joggers, Leggings, Shorts, Skirts)
  │   │   │   └── aa-1-17-2-2: Loungewear Tops
  │   │   ├── aa-1-17-3: Nightgowns [DONNA]
  │   │   ├── aa-1-17-4: Pajamas
  │   │   ├── aa-1-17-5: Robes
  │   │   └── aa-1-17-6: Onesies
  │   │
  │   ├── Socks (aa-1-18)
  │   │   ├── aa-1-18-1: Ankle Socks
  │   │   ├── aa-1-18-2: Athletic Socks
  │   │   ├── aa-1-18-3: Crew Socks
  │   │   ├── aa-1-18-4: Dance Socks
  │   │   ├── aa-1-18-5: Footie Socks
  │   │   ├── aa-1-18-6: Heel Socks
  │   │   ├── aa-1-18-7: Hold Up Socks
  │   │   ├── aa-1-18-8: Knee Socks
  │   │   └── aa-1-18-9: Panty Socks
  │   │
  │   ├── Suits (aa-1-19)
  │   │   ├── aa-1-19-1: Pant Suits
  │   │   ├── aa-1-19-2: Skirt Suits [DONNA]
  │   │   └── aa-1-19-3: Tuxedos
  │   │
  │   ├── Swimwear (aa-1-20)
  │   │   ├── aa-1-20-2: Boardshorts
  │   │   ├── aa-1-20-3: Swim Boxers
  │   │   ├── aa-1-20-4: Swim Briefs
  │   │   ├── aa-1-20-5: Burkinis
  │   │   ├── aa-1-20-6: Classic Bikinis [DONNA]
  │   │   ├── aa-1-20-7: Cover Ups [DONNA]
  │   │   ├── aa-1-20-12: Rash Guards
  │   │   ├── aa-1-20-17: Swim Dresses [DONNA]
  │   │   ├── aa-1-20-22: One-Piece Swimsuits [DONNA]
  │   │   └── aa-1-20-24: Swimwear Tops [DONNA]
  │   │
  │   ├── Traditional & Ceremonial Clothing (aa-1-23)
  │   │   ├── aa-1-23-1: Kimonos
  │   │   └── aa-1-23-2: Saris & Lehengas [DONNA]
  │   │
  │   ├── Uniforms & Workwear (aa-1-21) [2026 RELOCATION]
  │   │   ├── aa-1-21-1: Contractor Pants & Coveralls
  │   │   ├── aa-1-21-2: Flight Suits
  │   │   ├── aa-1-21-3: Food Service Uniforms
  │   │   ├── aa-1-21-4: Military Uniforms
  │   │   ├── aa-1-21-5: School Uniforms
  │   │   ├── aa-1-21-6: Security Uniforms
  │   │   ├── aa-1-21-7: Sports Uniforms
  │   │   ├── aa-1-21-8: White Coats
  │   │   └── aa-1-21-9: Scrubs [2026 RELOCATION from bi]
  │   │
  │   └── Wedding & Bridal Party Dresses (aa-1-22) [DONNA]
  │       ├── aa-1-22-1: Bridal Party Dresses
  │       └── aa-1-22-2: Wedding Dresses
  │
  ├── Clothing Accessories (aa-2)
  │   ├── aa-2-1: Arm Warmers & Sleeves
  │   ├── Baby & Children's Clothing Accessories (aa-2-2) [BAMBINI - 2026 UPDATE]
  │   │   ├── aa-2-2-1: Baby & Children's Belts
  │   │   ├── aa-2-2-2: Baby & Children's Gloves & Mittens
  │   │   ├── aa-2-2-3: Baby & Children's Hats
  │   │   └── aa-2-2-4: Baby Protective Wear
  │   ├── aa-2-3: Balaclavas
  │   ├── aa-2-4: Bandanas & Headties
  │   ├── aa-2-5: Belt Buckles
  │   ├── aa-2-6: Belts
  │   ├── aa-2-7: Bridal Accessories [DONNA]
  │   ├── aa-2-8: Button Studs
  │   ├── aa-2-9: Collar Stays
  │   ├── aa-2-10: Cufflinks
  │   ├── aa-2-11: Decorative Ties
  │   ├── aa-2-12: Earmuffs
  │   ├── aa-2-13: Gloves & Mittens
  │   ├── aa-2-14: Hair Accessories [DONNA]
  │   ├── aa-2-15: Handkerchiefs
  │   ├── aa-2-16: Headbands
  │   ├── aa-2-17: Hats (Baseball Caps, Beanies, Berets, Boater Hats, Bonnets, Bucket Hats, Cowboy Hats, Fedoras, Flat Caps, Panama Hats, Snapback Caps, Sun Hats, Top Hats, Trilbies, Trucker Hats, Visors, Winter Hats)
  │   ├── aa-2-18: Headwear (Fascinators, Headdresses, Turbans) [DONNA]
  │   ├── aa-2-19: Leg Warmers
  │   ├── aa-2-20: Leis
  │   ├── aa-2-21: Maternity Belts & Support Bands [DONNA]
  │   ├── aa-2-22: Neck Gaiters
  │   ├── aa-2-23: Neckties
  │   ├── aa-2-24: Ponytail Holders
  │   ├── aa-2-25: Sarongs
  │   ├── aa-2-26: Scarves & Shawls [DONNA]
  │   ├── aa-2-27: Sunglasses
  │   ├── aa-2-28: Suspenders
  │   ├── aa-2-29: Ties
  │   ├── aa-2-30: Tiaras [DONNA]
  │   └── aa-2-31: Umbrella Handles & Tips
  │
  ├── Handbags (aa-5) [DONNA]
  │   ├── aa-5-1: Clutches & Evening Bags
  │   ├── aa-5-2: Crossbody Bags
  │   ├── aa-5-3: Tote Bags
  │   └── aa-5-4: Wallets & Card Cases
  │
  ├── Jewelry (aa-6) [DONNA, UOMO]
  │   ├── aa-6-1: Anklets [DONNA]
  │   ├── aa-6-2: Body Jewelry
  │   ├── aa-6-3: Bracelets
  │   ├── aa-6-4: Brooches & Lapel Pins
  │   ├── aa-6-5: Charms & Pendants
  │   ├── aa-6-6: Earrings [DONNA]
  │   ├── aa-6-7: Jewelry Sets [DONNA]
  │   ├── aa-6-8: Necklaces [DONNA]
  │   ├── aa-6-9: Rings
  │   ├── aa-6-10: Watch Accessories
  │   ├── aa-6-11: Watches
  │   └── aa-6-12: Smart Watches
  │
  ├── Shoe Accessories (aa-7)
  │   ├── aa-7-1: Boot Liners
  │   ├── aa-7-2: Gaiters
  │   ├── aa-7-3: Shoe Covers
  │   ├── aa-7-4: Shoe Grips
  │   ├── aa-7-5: Shoe Inserts (Anti Slip Steps, Arch Supports, Gel Pads, Heel Cushions)
  │   ├── aa-7-6: Shoelaces
  │   └── aa-7-7: Spurs
  │
  └── Shoes (aa-8)
      ├── aa-8-1: Athletic Shoes
      ├── aa-8-2: Baby & Children's Shoes [BAMBINI - 2026 UPDATE]
      │   ├── aa-8-2-1: Baby & Children's Boots
      │   ├── aa-8-2-2: Baby & Children's Sandals
      │   ├── aa-8-2-4: Baby & Children's Athletic Shoes
      │   ├── aa-8-2-5: Baby & Children's Sneakers
      │   └── aa-8-2-6: First Steps & Crawlers
      ├── aa-8-3: Boots
      ├── aa-8-6: Sandals
      ├── aa-8-7: Slippers
      ├── aa-8-8: Sneakers
      ├── aa-8-9: Flats [DONNA]
      └── aa-8-10: Heels [DONNA - TACCHI] ⭐
  
  BABY & TODDLER (bt) - CATEGORIE BAMBINI COMPLETE
  ├── Baby Care (bt-1)
  │   ├── bt-1-1: Baby Health & Safety (Health Monitors, Nasal Aspirators, Pacifiers, Teethers, Thermometers)
  │   └── bt-1-2: Baby Personal Care (Baby Bathing, Baby Gift Sets, Baby Skin Care, Baby Sun Care, Baby Wipes)
  ├── Baby Safety (bt-2)
  │   ├── bt-2-1: Baby Monitors
  │   ├── bt-2-2: Baby Safety Gates
  │   ├── bt-2-3: Baby Safety Locks & Guards
  │   └── bt-2-4: Baby Safety Rails
  ├── Nursery (bt-3)
  │   ├── bt-3-1: Nursery Furniture (Bassinets, Changing Tables, Cradles, Cribs, Nursery Chairs & Gliders)
  │   └── bt-3-2: Nursery Decor (Baby Mobiles, Night Lights, Nursery Wall Art, Sound Machines)
  ├── Nursing & Feeding (bt-10)
  │   ├── bt-10-1: Baby Bottles
  │   ├── bt-10-2: Baby Bottle Nipples & Liners
  │   ├── bt-10-3: Bottle Warmers & Sterilizers
  │   ├── bt-10-4: Breast Milk Storage Containers
  │   ├── bt-10-5: Breast Pump Accessories
  │   ├── bt-10-6: Breast Pumps (Double Electric, Electric, Manual)
  │   ├── bt-10-7: Burp Cloths
  │   ├── bt-10-8: Nursing Covers
  │   ├── bt-10-9: Nursing Pads & Shields
  │   ├── bt-10-10: Nursing Pillow Covers
  │   ├── bt-10-11: Nursing Pillows
  │   └── bt-10-12: Sippy Cups
  ├── Potty Training (bt-11)
  │   ├── bt-11-1: Potties
  │   ├── bt-11-2: Potty Training Kits
  │   └── bt-11-3: Toilet Seats & Step Stools
  ├── Feeding Essentials (bt-12) [2026 UPDATE]
  │   ├── bt-12-1: Bibs
  │   ├── bt-12-2: Feeding Bowls
  │   ├── bt-12-3: Flatware Sets
  │   ├── bt-12-4: Plates
  │   ├── bt-12-5: Sippy Cups
  │   └── bt-12-6: Spoons
  └── Swaddling & Receiving Blankets (bt-13)
      ├── bt-13-1: Receiving Blankets
      └── bt-13-2: Swaddling Blankets
  
  ELECTRONICS (el) - COMPLETE
  ├── Arcades (el-1)
  │   ├── el-1-1: Arcade Games
  │   ├── el-1-2: Arcade Machine Accessories (Bill Acceptors, Coin Doors, Control Panels, Joysticks, Trackballs)
  │   ├── el-1-3: Pinball Machines
  │   └── el-1-4: Video Game Arcade Cabinets
  ├── Audio (el-2)
  │   ├── el-2-1: Audio Accessories
  │   ├── el-2-2: Headphones & Headsets (Aviation, Gaming, Hearing Protection, Office & Call Center, Over-Ear, Earbud & In-Ear)
  │   ├── el-2-3: Microphones (Condenser, Dynamic, Ribbon, USB, Wireless, Lavalier)
  │   ├── el-2-4: Speakers (Bookshelf, Floor Standing, In-Ceiling, In-Wall, Outdoor, Portable, Subwoofers, Soundbars)
  │   ├── el-2-5: Audio Amplifiers (Integrated, Power, Preamplifiers, Tube)
  │   ├── el-2-6: Audio Players & Recorders (Cassette, CD, Network Streamers, Turntables, Record Players)
  │   └── el-2-7: Audio Components (CD Players, DACs, Equalizers, Signal Processors, Tuners)
  ├── Computers (el-3)
  │   ├── el-3-1: Computer Components (CPUs, GPUs, Motherboards, RAM, Power Supplies, Cooling)
  │   ├── el-3-2: Computer Peripherals (Keyboards, Mice, Monitors, Webcams, Graphics Tablets)
  │   ├── el-3-3: Data Storage (External Hard Drives, SSDs, NAS, USB Flash Drives, Memory Cards)
  │   ├── el-3-4: Laptops (Gaming, Business, 2-in-1, Chromebooks)
  │   ├── el-3-5: Desktops (All-in-One, Gaming, Workstations)
  │   ├── el-3-6: Tablets (Drawing Tablets, E-Readers, Rugged Tablets)
  │   └── el-3-7: Servers (Blade, Rack, Tower)
  ├── Mobile & Smart Phones (el-4)
  │   ├── el-4-1: Mobile & Smart Phones (Smartphones, Feature Phones, Rugged Phones)
  │   ├── el-4-2: Mobile Phone Accessories (Cases, Screen Protectors, Chargers, Cables, Mounts, Power Banks)
  │   ├── el-4-3: Mobile Phone Parts (Screens, Batteries, Cameras, Charging Ports, Logic Boards)
  │   └── el-4-4: Smart Watches & Wearables (Fitness Trackers, Smart Glasses, VR Headsets)
  ├── Networking (el-5)
  │   ├── el-5-1: Bridges & Routers (Cellular, Mesh WiFi, Wired)
  │   ├── el-5-2: Modems (Cable, DSL, Cellular, Satellite)
  │   ├── el-5-3: Network Cards & Adapters (Bluetooth, Ethernet, WiFi, Powerline)
  │   ├── el-5-4: Networking Accessories (Cables, Switches, Hubs, Patch Panels)
  │   └── el-5-5: Wireless Access Points
  ├── Print, Copy, Scan & Fax (el-6)
  │   ├── el-6-1: Printers (Inkjet, Laser, 3D, Label, Photo, Thermal)
  │   ├── el-6-2: Printer Consumables (Ink Cartridges, Toner, 3D Filament, Paper)
  │   ├── el-6-3: Printer Parts & Accessories (Replacement Parts, Cleaning Kits)
  │   ├── el-6-4: Scanners (Flatbed, Sheetfed, 3D, Photo, Portable)
  │   └── el-6-5: Fax Machines
  ├── Video (el-7)
  │   ├── el-7-1: Cameras (DSLR, Mirrorless, Action, 360, Instant, Webcams, Security)
  │   ├── el-7-2: Camera Accessories (Bags, Tripods, Lenses, Flashes, Memory Cards, Batteries)
  │   ├── el-7-3: TVs & Displays (LED, OLED, QLED, Smart TVs, Monitors, Projectors)
  │   ├── el-7-4: TV & Video Accessories (Mounts, Cables, Remotes, Streaming Devices, Antennas)
  │   ├── el-7-5: Video Players & Recorders (DVD, Blu-ray, DVRs, Media Players)
  │   └── el-7-6: Video Production Equipment (Camcorders, Switchers, Green Screens, Teleprompters)
  └── Video Game Consoles (el-8)
      ├── el-8-1: Home Game Consoles (PlayStation, Xbox, Nintendo Switch)
      ├── el-8-2: Handheld Game Consoles (Nintendo Switch Lite, Steam Deck, Retro Handhelds)
      ├── el-8-3: Video Game Console Accessories (Controllers, Cables, Cases, Charging Docks, Memory)
      └── el-8-4: Gaming Computers (Gaming PCs, Gaming Laptops)
  
  HOME & GARDEN (hg) - COMPLETE
  ├── Bath (hg-1)
  │   ├── hg-1-1: Bath Accessories (Caddies, Mats, Robes, Towels, Shower Curtains)
  │   ├── hg-1-2: Bath Fixtures (Faucets, Shower Heads, Bathtubs, Sinks, Toilets)
  │   └── hg-1-3: Bathroom Furniture (Cabinets, Shelves, Vanities, Medicine Cabinets)
  ├── Bedding (hg-2)
  │   ├── hg-2-1: Bedding Sets (Comforters, Duvet Covers, Sheet Sets, Quilts)
  │   ├── hg-2-2: Blankets & Throws (Weighted, Electric, Fleece, Wool)
  │   ├── hg-2-3: Pillows (Bed Pillows, Decorative, Body Pillows, Pillow Protectors)
  │   └── hg-2-4: Mattress Accessories (Protectors, Toppers, Foundations)
  ├── Cleaning Supplies (hg-3)
  │   ├── hg-3-1: Cleaning Tools (Brooms, Mops, Vacuums, Steam Cleaners, Squeegees)
  │   ├── hg-3-2: Cleaning Products (Detergents, Disinfectants, Glass Cleaners, Floor Cleaners)
  │   └── hg-3-3: Trash & Recycling (Bins, Bags, Composters, Recycling Bins)
  ├── Decor (hg-4)
  │   ├── hg-4-1: Artwork (Paintings, Prints, Photography, Sculptures, Wall Art)
  │   ├── hg-4-2: Clocks (Alarm, Wall, Mantel, Grandfather, Cuckoo)
  │   ├── hg-4-3: Lamps & Lighting (Ceiling, Floor, Table, Wall, Outdoor, Smart Lighting)
  │   ├── hg-4-4: Mirrors (Wall, Floor, Vanity, Decorative)
  │   ├── hg-4-5: Rugs & Carpets (Area Rugs, Runners, Outdoor, Carpet Tiles)
  │   ├── hg-4-6: Seasonal Decor (Christmas, Halloween, Easter, Thanksgiving, Patriotic)
  │   └── hg-4-7: Vases & Decorative Bowls
  ├── Furniture (hg-5)
  │   ├── hg-5-1: Bathroom Furniture (Cabinets, Shelves, Hampers)
  │   ├── hg-5-2: Bedroom Furniture (Beds, Dressers, Nightstands, Wardrobes, Mattresses)
  │   ├── hg-5-3: Kitchen & Dining Furniture (Tables, Chairs, Bar Stools, Buffets, China Cabinets)
  │   ├── hg-5-4: Living Room Furniture (Sofas, Couches, Loveseats, Recliners, Coffee Tables, TV Stands)
  │   ├── hg-5-5: Office Furniture (Desks, Office Chairs, Bookcases, Filing Cabinets)
  │   ├── hg-5-6: Outdoor Furniture (Patio Sets, Lounge Chairs, Hammocks, Umbrellas, Fire Pits)
  │   └── hg-5-7: Closet Parts & Accessories [2026 NEW]
  │       ├── hg-5-7-1: Closet Baskets
  │       ├── hg-5-7-2: Closet Bins
  │       ├── hg-5-7-3: Closet Doors
  │       ├── hg-5-7-4: Closet Drawers
  │       ├── hg-5-7-5: Closet Rods
  │       └── hg-5-7-6: Closet Shelves
  ├── Garden (hg-6)
  │   ├── hg-6-1: Gardening Tools (Shovels, Rakes, Hoes, Pruners, Trowels, Wheelbarrows)
  │   ├── hg-6-2: Gardening Accessories (Gloves, Kneelers, Aprons, Hats)
  │   ├── hg-6-3: Live Plants (Indoor, Outdoor, Trees, Shrubs, Flowers, Vegetables)
  │   ├── hg-6-4: Seeds & Bulbs (Flower Seeds, Vegetable Seeds, Bulbs, Grass Seed)
  │   ├── hg-6-5: Watering & Irrigation (Hoses, Sprinklers, Watering Cans, Drip Systems)
  │   ├── hg-6-6: Hydroponics [2026 NEW]
  │   │   ├── hg-6-6-1: Growing Media (Clay Pebbles, Coconut Coir, Perlite, Rockwool, Vermiculite)
  │   │   ├── hg-6-6-2: Grow Lights (Fluorescent, HID, LED)
  │   │   ├── hg-6-6-3: Hydroponic Systems (Aeroponics, Aquaponics, DWC, Drip Systems, Ebb & Flow, NFT)
  │   │   └── hg-6-6-4: Nutrients & Supplements
  │   └── hg-6-7: Outdoor Kitchens [2026 NEW]
  ├── Kitchen & Dining (hg-7)
  │   ├── hg-7-1: Cookware (Pots, Pans, Dutch Ovens, Woks, Pressure Cookers, Air Fryers [2026])
  │   ├── hg-7-2: Bakeware (Cake Pans, Cookie Sheets, Muffin Tins, Pie Dishes, Baking Mats)
  │   ├── hg-7-3: Kitchen Appliances (Blenders, Mixers, Food Processors [2026], Coffee Makers, Toasters)
  │   ├── hg-7-4: Kitchen Tools & Utensils (Spatulas, Ladles, Whisks, Knives, Cutting Boards)
  │   ├── hg-7-5: Tableware (Dinnerware, Flatware [2026 EXPANDED], Glassware, Serveware)
  │   ├── hg-7-6: Food Storage (Containers, Jars, Canisters, Bread Boxes, Vacuum Sealers)
  │   └── hg-7-7: Barware (Cocktail Shakers, Jiggers, Bar Spoons, Corkscrews, Wine Openers [2026])
  └── Outdoor Living (hg-8)
      ├── hg-8-1: Grills & Outdoor Cooking (Gas, Charcoal, Electric, Smokers, Pizza Ovens)
      ├── hg-8-2: Outdoor Heating & Cooling (Patio Heaters, Fire Pits, Misters, Fans)
      ├── hg-8-3: Outdoor Structures (Gazebos, Pergolas, Awnings, Canopies, Sheds)
      └── hg-8-4: Outdoor Decor (Wind Chimes, Bird Feeders, Garden Statues, Fountains)
  
  HEALTH & BEAUTY (hb) - COMPLETE
  ├── Health Care (hb-1)
  │   ├── hb-1-1: Medical Devices (Blood Pressure Monitors, Thermometers, Nebulizers, Hearing Aids [2026])
  │   ├── hb-1-2: Medical Tests (COVID-19 Tests [2026], Flu Tests [2026], Pregnancy Tests, Drug Tests)
  │   ├── hb-1-3: First Aid (Bandages, Antiseptics, Burn Care, First Aid Kits)
  │   └── hb-1-4: Mobility Aids (Canes, Crutches, Walkers, Wheelchairs, Scooters)
  ├── Personal Care (hb-2)
  │   ├── hb-2-1: Bath & Body (Body Wash, Soap, Bath Bombs [2026], Scrubs, Body Lotion)
  │   ├── hb-2-2: Hair Care (Shampoo, Conditioner, Treatments [2026], Styling Products, Hair Dye)
  │   ├── hb-2-3: Oral Care (Toothbrushes, Toothpaste, Floss, Mouthwash, Whitening)
  │   ├── hb-2-4: Skin Care (Cleansers, Moisturizers, Serums, Sunscreen, Masks, Body Butters [2026])
  │   ├── hb-2-5: Shaving & Grooming (Razors, Shaving Cream, Aftershave, Beard Care, Epilators)
  │   └── hb-2-6: Feminine Care (Tampons, Pads, Menstrual Cups, Feminine Intimate Wash [2026])
  ├── Cosmetics (hb-3)
  │   ├── hb-3-1: Makeup (Face, Eyes, Lips, Nails, Makeup Removers, Tools & Brushes)
  │   ├── hb-3-2: Fragrances (Perfumes, Colognes, Body Sprays, Perfume Making Kits [2026])
  │   └── hb-3-3: Nail Care (Polish, Treatments, Tools, Artificial Nails, Nail Art)
  ├── Wellness (hb-4)
  │   ├── hb-4-1: Vitamins & Supplements (Multivitamins, Probiotics, Protein, Herbal Supplements)
  │   ├── hb-4-2: Weight Loss (Detox & Cleanse [2026], Meal Replacements [2026], Supplements [2026])
  │   ├── hb-4-3: Sexual Wellness (Condoms, Lubricants, Adult Toys, Fertility)
  │   └── hb-4-4: Medical Face Masks [2026]
  └── Medical (hb-5)
      ├── hb-5-1: Orthopedic Supplies (Braces, Supports, Compression, Splints)
      └── hb-5-2: Respiratory Care (Nebulizers, Oxygen, CPAP, Inhalers)
  
  SPORTING GOODS (sg) - COMPLETE
  ├── Athletics (sg-1)
  │   ├── sg-1-1: Baseball & Softball (Bats, Gloves, Balls, Helmets, Protective Gear)
  │   ├── sg-1-2: Basketball (Hoops, Balls, Shoes [2026], Training Equipment)
  │   ├── sg-1-3: Football (Helmets, Pads, Balls, Training Equipment, Shoes [2026])
  │   ├── sg-1-4: Soccer (Balls, Cleats, Shin Guards, Goals, Goalie Equipment, Shoes [2026])
  │   ├── sg-1-5: Tennis (Rackets, Balls, Shoes [2026], Bags, Stringing Machines)
  │   ├── sg-1-6: Golf (Clubs, Balls, Bags, Shoes [2026], Carts, Training Aids)
  │   ├── sg-1-7: Gymnastics (Apparatus, Mats, Training Equipment)
  │   ├── sg-1-8: Track & Field (Equipment, Implements, Starting Blocks)
  │   ├── sg-1-9: Volleyball (Balls, Nets, Knee Pads, Shoes)
  │   └── sg-1-10: Wrestling (Mats, Headgear, Shoes, Singlets)
  ├── Exercise & Fitness (sg-2)
  │   ├── sg-2-1: Cardio Equipment (Treadmills, Ellipticals, Exercise Bikes, Rowing Machines)
  │   ├── sg-2-2: Strength Training (Dumbbells, Barbells, Kettlebells, Weight Plates, Benches, Racks)
  │   ├── sg-2-3: Fitness Accessories (Yoga Mats, Resistance Bands, Foam Rollers, Jump Ropes)
  │   ├── sg-2-4: Boxing & MMA (Gloves, Punching Bags, Protective Gear, Training Equipment)
  │   └── sg-2-5: Gymnastics & Dance (Leotards, Mats, Bars, Beams)
  ├── Outdoor Recreation (sg-3)
  │   ├── sg-3-1: Camping (Tents, Sleeping Bags, Backpacks, Camping Hammocks [2026], Stoves, Lanterns)
  │   ├── sg-3-2: Hiking (Boots, Backpacks, Trekking Poles, Navigation, Hydration)
  │   ├── sg-3-3: Climbing (Harnesses, Ropes, Carabiners, Shoes [2026], Helmets, Crash Pads)
  │   ├── sg-3-4: Cycling (Bikes, Helmets, Accessories, Clothing, Shoes, Components)
  │   ├── sg-3-5: Fishing (Rods, Reels, Tackle, Lures, Waders, Fish Finders [2026])
  │   ├── sg-3-6: Hunting (Blinds, Tree Stands, Decoys, Game Calls, Optics)
  │   └── sg-3-7: Equestrian (Saddles, Bridles, Helmets, Boots, Horse Care)
  ├── Water Sports (sg-4)
  │   ├── sg-4-1: Boating (Kayaks, Canoes, Paddleboards, Boats, Outboards, Accessories)
  │   ├── sg-4-2: Diving & Snorkeling (Masks, Fins, Snorkels, Wetsuits, Scuba Gear)
  │   ├── sg-4-3: Swimming (Goggles, Caps, Training Equipment, Pool Games)
  │   ├── sg-4-4: Surfing (Boards, Wetsuits, Leashes, Traction Pads, Board Bags)
  │   ├── sg-4-5: Water Skiing & Wakeboarding (Skis, Wakeboards, Ropes, Bindings)
  │   ├── sg-4-6: Windfoiling [2026 NEW]
  │   │   ├── sg-4-6-1: Windfoiling Boards
  │   │   ├── sg-4-6-2: Windfoiling Foils
  │   │   ├── sg-4-6-3: Windfoiling Parts (Fuselages, Masts, Stabilizers)
  │   │   ├── sg-4-6-4: Windfoiling Sails
  │   │   └── sg-4-6-5: Windfoiling Accessories
  │   └── sg-4-7: Wingfoiling [2026 NEW]
  │       ├── sg-4-7-1: Wingfoiling Boards
  │       ├── sg-4-7-2: Wingfoiling Foils
  │       ├── sg-4-7-3: Wingfoiling Parts (Fuselages, Masts, Stabilizers, Wing Parts)
  │       ├── sg-4-7-4: Wingfoiling Wings
  │       └── sg-4-7-5: Wingfoiling Accessories
  ├── Winter Sports (sg-5)
  │   ├── sg-5-1: Skiing (Skis, Bindings, Boots, Poles, Helmets, Goggles)
  │   ├── sg-5-2: Snowboarding (Boards, Bindings, Boots, Helmets, Goggles)
  │   ├── sg-5-3: Curling [2026 NEW] (Brooms, Shoes, Stones, Training Aids)
  │   ├── sg-5-4: Ice Skating (Skates, Guards, Soakers, Training Aids)
  │   └── sg-5-5: Sledding (Sleds, Tubes, Snowshoes)
  └── Racquet Sports (sg-6)
      ├── sg-6-1: Badminton (Rackets, Shuttlecocks, Nets, Shoes [2026])
      ├── sg-6-2: Racquetball & Squash (Rackets, Balls, Goggles, Shoes [2026])
      ├── sg-6-3: Table Tennis (Paddles, Balls, Tables, Nets)
      └── sg-6-4: Tennis (Rackets, Balls, Shoes, Strings, Bags)
  
  TOYS & GAMES (tg) - COMPLETE
  ├── Games (tg-1)
  │   ├── tg-1-1: Board Games (Strategy, Family, Party, Cooperative, Classic)
  │   ├── tg-1-2: Card Games (Trading Cards, Playing Cards, Collectible Cards)
  │   ├── tg-1-3: Puzzles (Jigsaw, 3D, Brain Teasers, Mechanical)
  │   ├── tg-1-4: Outdoor Games (Lawn Games, Toss Games, Water Games, Inflatable Games)
  │   └── tg-1-5: Game Accessories (Dice, Timers, Scoreboards, Card Shufflers)
  ├── Toys (tg-2)
  │   ├── tg-2-1: Action Figures & Playsets (Superheroes, Movie Characters, Animals, Dinosaurs)
  │   ├── tg-2-2: Arts & Crafts (Drawing, Painting, Sculpting, Jewelry Making, Kits)
  │   ├── tg-2-3: Building Toys (LEGO, Blocks, Construction Sets, Marble Runs)
  │   ├── tg-2-4: Dolls & Accessories (Fashion Dolls, Baby Dolls, Dollhouses, Accessories)
  │   ├── tg-2-5: Educational Toys (STEM, Learning Games, Science Kits, Musical Toys)
  │   ├── tg-2-6: Electronic Toys (Robots, Drones, RC Vehicles, Interactive Toys)
  │   ├── tg-2-7: Pretend Play (Kitchens, Tool Sets, Costumes, Play Food, Cash Registers)
  │   ├── tg-2-8: Plush Toys (Stuffed Animals, Character Plush, Interactive Plush)
  │   ├── tg-2-9: Ride-On Toys (Scooters, Bikes, Trikes, Wagons, Electric Ride-Ons)
  │   ├── tg-2-10: Sports Toys (Nerf, Foam Balls, Mini Hoops, T-Ball Sets)
  │   └── tg-2-11: Sensory Toys [2026 NEW]
  └── Hobby & Collectibles (tg-3)
      ├── tg-3-1: Collectible Cards (Sports, Gaming, Entertainment)
      ├── tg-3-2: Collectible Coins & Currency
      ├── tg-3-3: Collectible Figurines (Anime, Gaming, Pop Culture)
      ├── tg-3-4: Comic Books [2026 NEW]
      └── tg-3-5: Model Kits (Cars, Planes, Ships, Dioramas)
  
  VEHICLES & PARTS (vp) - COMPLETE
  ├── Cars, Trucks & Vans (vp-1)
  │   ├── vp-1-1: Cars (Sedans, SUVs, Coupes, Hatchbacks, Wagons, Convertibles)
  │   ├── vp-1-2: Trucks (Pickup Trucks, Heavy Duty, Medium Duty)
  │   ├── vp-1-3: Vans (Minivans, Cargo Vans, Passenger Vans, Conversion Vans)
  │   ├── vp-1-4: Hybrid Vehicles [2026 NEW] (Hybrid Cars, Hybrid Trucks, Hybrid Vans)
  │   └── vp-1-5: Vintage & Classic Vehicles [2026 NEW] (Classic Cars, Classic Trucks, Classic Vans)
  ├── Motorcycles & Powersports (vp-2)
  │   ├── vp-2-1: Motorcycles (Cruisers, Sportbikes, Touring, Dirt Bikes, Scooters, Mopeds)
  │   ├── vp-2-2: ATVs & UTVs (Sport ATVs, Utility ATVs, Side-by-Sides)
  │   ├── vp-2-3: Snowmobiles
  │   └── vp-2-4: Personal Watercraft (Jet Skis, WaveRunners)
  ├── Aircraft (vp-3) [2026 EXPANDED]
  │   ├── vp-3-1: Heavier-Than-Air Aircraft [2026 NEW]
  │   │   ├── vp-3-1-1: Autogyros
  │   │   ├── vp-3-1-2: Drones (Consumer, Professional, Racing, Agricultural)
  │   │   ├── vp-3-1-3: Gliders
  │   │   ├── vp-3-1-4: Helicopters (Civil, Military)
  │   │   ├── vp-3-1-5: Jets (Large, Light, Long Range, Mid-Size, Super Mid-Size, Very Light)
  │   │   ├── vp-3-1-6: Light Aircraft
  │   │   └── vp-3-1-7: Ultralights
  │   └── vp-3-2: Lighter-Than-Air Aircraft [2026 NEW]
  │       ├── vp-3-2-1: Airships & Dirigibles
  │       └── vp-3-2-2: Hot Air Balloons
  ├── Watercraft (vp-4)
  │   ├── vp-4-1: Boats (Fishing, Sailboats, Yachts, Pontoon, Personal Watercraft)
  │   ├── vp-4-2: Boat Parts & Accessories (Engines, Propellers, Electronics, Anchors)
  │   └── vp-4-3: Watercraft Safety Equipment [2026 NEW] (Life Rafts, EPIRBs, Flares, Lifebuoys)
  ├── Motor Vehicle Parts (vp-5)
  │   ├── vp-5-1: Braking Systems (Pads, Rotors, Calipers, Brake Lines, ABS)
  │   ├── vp-5-2: Cooling Systems (Radiators, Fans, Hoses, Thermostats, Water Pumps [2026])
  │   ├── vp-5-3: Engine Parts (Filters, Belts, Hoses, Gaskets, Spark Plugs, Glow Plugs [2026])
  │   ├── vp-5-4: Exhaust Systems (Mufflers, Catalytic Converters, Tips, Headers)
  │   ├── vp-5-5: Frame & Body Parts (Bumpers, Fenders, Doors, Hoods, Grilles [2026])
  │   ├── vp-5-6: Lighting (Headlights, Taillights, Fog Lights, LED Bars, Signals)
  │   ├── vp-5-7: Power & Electrical (Alternators, Starters, Batteries, Wiring, Ignition [2026])
  │   ├── vp-5-8: Sensors & Gauges (Oxygen, Temperature, Pressure, Speedometers [2026 EXPANDED])
  │   ├── vp-5-9: Transmission & Drivetrain (Clutches, Axles, Differentials, CV Joints [2026])
  │   └── vp-5-10: Wheels & Tires (Rims, Hubcaps, Tires, TPMS, Wheel Covers)
  ├── Motor Vehicle Accessories (vp-6)
  │   ├── vp-6-1: Interior Accessories (Seat Covers, Floor Mats, Steering Covers, Organizers)
  │   ├── vp-6-2: Exterior Accessories (Covers, Deflectors, Decals, Bull Bars, Running Boards)
  │   ├── vp-6-3: Towing & Hauling (Hitches, Trailers, Roof Racks, Cargo Carriers)
  │   ├── vp-6-4: Vehicle Care (Cleaning Kits, Waxes, Polishes, Tire Care, Glass Cleaners)
  │   └── vp-6-5: Vehicle Electronics (GPS, Dash Cams, Audio, Alarms, Remote Starters)
  ├── Motor Sports Vehicles (vp-7) [2026 NEW]
  │   ├── vp-7-1: Race Cars (Drag, Drift, Formula, GT, Rally, Sports Prototypes, Stock, Touring)
  │   ├── vp-7-2: Racing Karts
  │   ├── vp-7-3: Racing Motorcycles (Enduro, Motocross, Speedway, Trials)
  │   ├── vp-7-4: Racing Sidecars
  │   └── vp-7-5: Racing Trucks
  ├── Commercial & Service Vehicles (vp-8) [2026 NEW]
  │   ├── vp-8-1: Buses (Articulated, City, Coaches, Double Decker, Minibuses, School, Trolleybuses)
  │   ├── vp-8-2: Emergency Vehicles (Ambulances, Fire Trucks, Police Cars/Police Trucks/Police Vans)
  │   ├── vp-8-3: Taxis
  │   └── vp-8-4: Military Vehicles
  └── Vehicle Protective Gear (vp-9)
      ├── vp-9-1: Off-Road & Motor Sports Gear [2026 RELOCATION]
      │   ├── vp-9-1-1: Racing Suits & Gear (Balaclavas, Chest Guards, Gloves, Goggles, Helmets, Neck Supports)
      │   ├── vp-9-1-2: ATV & UTV Gear (Body Armor, Boots, Gloves, Goggles, Helmets)
      │   └── vp-9-1-3: Aircraft Protective Gear [2026 NEW] (Anti-G Suits, Emergency Oxygen, Parachutes, Flight Suits, Helmets)
      ├── vp-9-2: Motorcycle Gear (Helmets, Jackets, Gloves, Boots, Armor)
      └── vp-9-3: Water Sport Helmets
  
  ARTS & ENTERTAINMENT (ae) - HIGHLIGHTS
  ├── Musical Instruments (ae-2-8)
  │   ├── ae-2-8-1: Brass Instruments (Trumpets, Trombones, Tubas, French Horns, Cornets)
  │   ├── ae-2-8-2: Drums & Percussion (Acoustic, Electronic, Cymbals, Hand Percussion, Practice Pads)
  │   ├── ae-2-8-3: Guitars (Acoustic, Electric, Bass, Classical, 12-String, Resonators)
  │   ├── ae-2-8-4: Keyboards & Synthesizers (Digital Pianos, Synthesizers, MIDI Controllers, Organs)
  │   ├── ae-2-8-5: Percussion (Drum Sets, Cymbals, Snare Drums, Tom-Toms, Hi-Hats, Crash/Ride [2026])
  │   ├── ae-2-8-6: Pianos (Acoustic, Electric, Grand, Upright)
  │   ├── ae-2-8-7: String Instruments (Violins, Violas, Cellos, Double Basses, Harps)
  │   ├── ae-2-8-8: Woodwinds (Clarinets, Flutes, Saxophones, Oboes, Bassoons, Harmonicas, Recorders)
  │   └── ae-2-8-9: Folk & World Instruments (Banjos [2026], Mandolins [2026], Ukuleles [2026], Didgeridoos [2026])
  ├── Arts & Crafts (ae-2-1)
  │   ├── ae-2-1-1: Art & Craft Kits (Candle Making [2026], Drawing, Jewelry, Mosaic, Sewing)
  │   ├── ae-2-1-2: Art & Crafting Materials (Beads, Clay, Fabric, Leather, Paper, Wood, Candle Making [2026])
  │   ├── ae-2-1-3: Art & Crafting Tools (Cutting Tools, Embossing Tools, Kilns [2026], Weaving Looms)
  │   └── ae-2-1-4: Olfactory Arts [2026 NEW]
  │       ├── ae-2-1-4-1: Candle Making (Wax, Wicks, Molds, Dyes, Scents)
  │       ├── ae-2-1-4-2: Perfume Making (Kits, Ingredients, Bases, Fragrance Oils)
  │       └── ae-2-1-4-3: Incense Making (Tools, Materials, Kits)
  └── Collectibles (ae-2-2)
      ├── ae-2-2-1: Collectible Coins & Currency
      ├── ae-2-2-2: Collectible Trading Cards (Sports, Gaming, Entertainment)
      └── ae-2-2-3: Comic Books [2026 NEW]
  
  FOOD, BEVERAGES & TOBACCO (fb) - HIGHLIGHTS
  ├── Beverages (fb-1)
  │   ├── fb-1-1: Coffee (Beans, Ground, Instant, Ready-To-Drink [2026], Pods, Capsules)
  │   ├── fb-1-2: Tea & Infusions (Black, Green, Herbal, Ready-To-Drink [2026], Matcha)
  │   ├── fb-1-3: Hot Chocolate (Mixes, Ready-To-Drink [2026])
  │   └── fb-1-4: Soft Drinks & Water
  ├── Food Items (fb-2)
  │   ├── fb-2-1: Baked Goods (Bread, Pastries, Cakes, Cookies)
  │   ├── fb-2-2: Cooking Ingredients (Oils, Vinegars, Sauces, Spices, Seasonings)
  │   ├── fb-2-3: Grains, Rice & Cereal (Popcorn Kernels [2026], Pasta, Rice, Oats, Cereal)
  │   └── fb-2-4: Snack Foods (Chips, Nuts, Crackers, Candy, Chocolate [2026 EXPANDED])
  └── Tobacco & Cannabis (fb-3) [2026 EXPANDED]
      ├── fb-3-1: Tobacco Products (Cigarettes, Cigars, Pipe Tobacco, Vaping)
      └── fb-3-2: Cannabis Products [2026 NEW] (Seeds, Medical, Recreational, Pipes & Bongs, Vaping)
  
  LUGGAGE & BAGS (lb) - COMPLETE
  ├── Backpacks (lb-1)
  │   ├── lb-1-1: Hiking Backpacks [2026 NEW]
  │   ├── lb-1-2: Laptop Backpacks [2026 NEW]
  │   ├── lb-1-3: Military Backpacks [2026 NEW]
  │   └── lb-1-4: School Backpacks
  ├── Handbags (lb-2)
  │   ├── lb-2-1: Clutches & Evening Bags
  │   ├── lb-2-2: Crossbody Bags
  │   ├── lb-2-3: Tote Bags
  │   └── lb-2-4: Wallets & Card Cases
  ├── Luggage (lb-3)
  │   ├── lb-3-1: Carry-On Luggage
  │   ├── lb-3-2: Checked Luggage
  │   ├── lb-3-3: Luggage Sets
  │   └── lb-3-4: Travel Accessories (Tags, Locks, Straps, Organizers)
  └── Laptop Bags (lb-4) [2026 NEW]
      ├── lb-4-1: Laptop Briefcases
      ├── lb-4-2: Laptop Messengers
      └── lb-4-3: Laptop Sleeves
  
  BUSINESS & INDUSTRIAL (bi) - HIGHLIGHTS
  ├── Agriculture (bi-1) [2026 NEW]
  │   ├── bi-1-1: Agriculture Machinery (Tillage, Tractors [2026 EXPANDED], Harvesting)
  │   ├── bi-1-2: Beekeeping (Hives, Feed, Protective Gear, Honey Extraction)
  │   ├── bi-1-3: Smart Farming (Automated Feeders, Water Management, Livestock Monitoring)
  │   └── bi-1-4: Health & Veterinary (Diagnostic Equipment, Surgical, Vaccines)
  ├── Construction (bi-2)
  │   ├── bi-2-1: Construction Tools (Power Tools, Hand Tools, Measuring, Safety)
  │   ├── bi-2-2: Heavy Machinery (Excavators, Bulldozers, Cranes [2026], Concrete Mixers [2026])
  │   └── bi-2-3: Raw Structural Components [2026 NEW]
  └── Medical Equipment (bi-3)
      ├── bi-3-1: Medical Furniture (Exam Tables, Hospital Beds, Medical Chairs)
      ├── bi-3-2: Medical Instruments (Diagnostic, Surgical, Monitoring)
      └── bi-3-3: Medical Teaching Equipment [2026 NEW] (Simulators, Training Aids, Synthetic Models)
  
  ═══════════════════════════════════════════════════════════════
  INTELLIGENT CATEGORIZATION ENGINE - EXACT MATCHING
  ═══════════════════════════════════════════════════════════════
  
  STEP 1: Analyze Product Title & Description
  - Extract: Product type, material, gender, brand, function, age group
  - Keywords to category mapping:
  
  DONNA (WOMEN'S) KEYWORDS:
    • "Vestito", "Abito", "Dress" → aa-1-4 (Dresses)
    • "Gonna", "Skirt" → aa-1-15 (Skirts)
    • "Blusa", "Blouse" → aa-1-13-1 (Blouses)
    • "Tacchi", "Heels", "Décolleté", "Stiletto", "Pump", "Tacco alto" → aa-8-10 (Heels) ⭐
    • "Ballerine", "Ballet flats", "Flat shoes" → aa-8-9 (Flats)
    • "Reggiseno", "Bra", "Lingerie" → aa-1-6 (Lingerie)
    • "Intimo", "Underwear", "Mutande", "Perizoma" → aa-1-6-11 (Women's Underpants)
    • "Collant", "Calze", "Hosiery" → aa-1-6-6 (Hosiery)
    • "Mammma", "Gravidanza", "Maternity" → aa-1-7 (Maternity Clothing)
    • "Bikini", "Costume", "Swimsuit" → aa-1-20 (Swimwear)
    • "Pigiama", "Nightgown", "Camicia da notte" → aa-1-17-3 (Nightgowns)
    • "Borsa", "Handbag", "Purse" → aa-5 (Handbags)
    • "Gioielli", "Jewelry", "Orecchini", "Collana" → aa-6 (Jewelry)
    • "Sposa", "Wedding dress", "Abito da sposa" → aa-1-22-2 (Wedding Dresses)
    • "Velo", "Tiara" → aa-2-30 (Tiaras)
    • "Kimono" → aa-1-23-1 (Kimonos)
    • "Sari" → aa-1-23-2 (Saris & Lehengas)
    • "Scrub", "Camice medico" → aa-1-21-9 (Scrubs) [2026 RELOCATION]
  
  BAMBINI/CHILDREN'S KEYWORDS (2026 UPDATE):
    • "Neonato", "Baby", "Infant" → aa-1-2 (Baby & Children's Clothing) or bt categories
    • "Bambino", "Toddler", "Bimbo", "Bimba", "Ragazzo", "Ragazza" → aa-1-2 (Baby & Children's Clothing)
    • "Scarpine", "Baby shoes" → aa-8-2 (Baby & Children's Shoes)
    • "Pannolino", "Diaper" → aa-1-2-2 (Baby & Children's Diaper Covers)
    • "Tutina", "Onesie", "Body" → aa-1-2-10 (Baby One-Pieces) or aa-1-2-9-2 (Bodysuits)
    • "Primi passi", "First steps" → aa-8-2-6 (First Steps & Crawlers)
    • "Biberon", "Bottle" → bt-10-1 (Baby Bottles) or bt-12-5 (Sippy Cups in Feeding Essentials)
    • "Ciuccio", "Pacifier" → bt-1-1 (Baby Health & Safety)
    • "Seggiolino", "Car seat" → bt-2 (Baby Safety)
    • "Culla", "Crib" → bt-3-1 (Nursery Furniture)
    • "Pappa", "Pappa bambino" → bt-12 (Feeding Essentials) [2026 NEW]
    • "Mutandine bambina", "Slip bambino" → aa-1-2-11 (Toddler Underwear) or aa-1-5 (Girls' Underwear) / aa-1-3 (Boys' Underwear)
  
  ELECTRONICS KEYWORDS:
    • "Cuffie", "Headphones", "Auricolari" → el-2-2 (Headphones & Headsets)
    • "Telefono", "Smartphone", "iPhone", "Samsung" → el-4-1 (Mobile & Smart Phones)
    • "Computer", "PC", "Laptop" → el-3-4 (Laptops) or el-3-5 (Desktops)
    • "Console", "PlayStation", "Xbox", "Nintendo" → el-8-1 (Home Game Consoles)
    • "Fotocamera", "Camera", "Reflex", "Mirrorless" → el-7-1 (Cameras)
    • "TV", "Televisore", "Smart TV" → el-7-3 (TVs & Displays)
    • "Drone", "Droni" → vp-3-1-2 (Drones under Aircraft) [2026 NEW]
    • "Robot aspirapolvere", "Vacuum robot" → el-6 (Print, Copy, Scan & Fax) - NO! Use hg-3 (Cleaning Supplies) or appropriate home appliance
  
  HOME & GARDEN KEYWORDS:
    • "Divano", "Sofa", "Couch" → hg-5-4 (Living Room Furniture)
    • "Letto", "Bed" → hg-5-2 (Bedroom Furniture)
    • "Tavolo", "Table" → hg-5-3 (Kitchen & Dining Furniture) or hg-5-4 (Coffee Tables)
    • "Sedia", "Chair" → hg-5-3 (Kitchen & Dining) or hg-5-5 (Office Chairs)
    • "Lampada", "Lamp", "Light" → hg-4-3 (Lamps & Lighting)
    • "Tappeto", "Rug", "Carpet" → hg-4-5 (Rugs & Carpets)
    • "Pianta", "Plant", "Fiori" → hg-6-3 (Live Plants)
    • "Idroponica", "Hydroponics" → hg-6-6 (Hydroponics) [2026 NEW]
    • "Cucina esterna", "Outdoor kitchen" → hg-6-7 (Outdoor Kitchens) [2026 NEW]
    • "Armadio", "Closet" → hg-5-7 (Closet Parts & Accessories) [2026 NEW]
  
  HEALTH & BEAUTY KEYWORDS:
    • "Crema viso", "Face cream", "Skincare" → hb-2-4 (Skin Care)
    • "Shampoo", "Balsamo" → hb-2-2 (Hair Care)
    • "Trucco", "Makeup", "Rossetto" → hb-3-1 (Makeup)
    • "Profumo", "Fragranza" → hb-3-2 (Fragrances)
    • "Vitamine", "Integratori" → hb-4-1 (Vitamins & Supplements)
    • "Mascherina", "Face mask" → hb-4-4 (Medical Face Masks) [2026 NEW]
    • "Test gravidanza", "Pregnancy test" → hb-1-2 (Medical Tests)
    • "Saponetta", "Soap" → hb-2-1 (Bath & Body)
    • "Candela profumata", "Scented candle" → ae-2-1-4-1 (Candle Making under Olfactory Arts) [2026 NEW]
  
  SPORTING GOODS KEYWORDS:
    • "Bici", "Bicycle", "Mountain bike" → sg-3-4 (Cycling)
    • "Tapis roulant", "Treadmill" → sg-2-1 (Cardio Equipment)
    • "Pesi", "Dumbbells" → sg-2-2 (Strength Training)
    • "Tenda", "Tent" → sg-3-1 (Camping)
    • "Racchetta tennis", "Tennis racket" → sg-1-5 (Tennis)
    • "Sci", "Ski" → sg-5-1 (Skiing)
    • "Snowboard" → sg-5-2 (Snowboarding)
    • "Windfoil", "Wingfoil" → sg-4-6 (Windfoiling) / sg-4-7 (Wingfoiling) [2026 NEW]
    • "Curling" → sg-5-3 (Curling) [2026 NEW]
    • "Scarpe calcio", "Soccer shoes" → sg-1-4 (Soccer) - use attributes for shoes
  
  VEHICLES KEYWORDS:
    • "Auto", "Car", "Macchina" → vp-1-1 (Cars)
    • "Moto", "Motorcycle" → vp-2-1 (Motorcycles)
    • "Camion", "Truck" → vp-1-2 (Trucks)
    • "Furgone", "Van" → vp-1-3 (Vans)
    • "Ibrida", "Hybrid" → vp-1-4 (Hybrid Vehicles) [2026 NEW]
    • "Droni", "Drone" → vp-3-1-2 (Drones) [2026 NEW]
    • "Mongolfiera", "Hot air balloon" → vp-3-2-2 (Hot Air Balloons) [2026 NEW]
    • "Auto da corsa", "Race car" → vp-7-1 (Race Cars) [2026 NEW]
    • "Elicottero", "Helicopter" → vp-3-1-4 (Helicopters) [2026 NEW]
    • "Jet privato", "Private jet" → vp-3-1-5 (Jets) [2026 NEW]
    • "Ricambi auto", "Car parts" → vp-5 (Motor Vehicle Parts)
    • "Pneumatici", "Tires" → vp-5-10 (Wheels & Tires)
    • "Casco moto", "Motorcycle helmet" → vp-9-2 (Motorcycle Gear)
  
  FOOD & BEVERAGE KEYWORDS:
    • "Caffè", "Coffee" → fb-1-1 (Coffee)
    • "Tè", "Tea" → fb-1-2 (Tea & Infusions)
    • "Pronto da bere", "Ready-to-drink" → fb-1-1 (Coffee Ready-To-Drink) / fb-1-2 (Tea Ready-To-Drink) [2026]
    • "Popcorn", "Mais soffiato" → fb-2-3 (Popcorn Kernels) [2026]
    • "Cannabis", "CBD" → fb-3-2 (Cannabis Products) [2026 NEW]
    • "Cioccolata calda", "Hot chocolate" → fb-1-3 (Hot Chocolate)
  
  TOYS & GAMES KEYWORDS:
    • "LEGO", "Costruzioni" → tg-2-3 (Building Toys)
    • "Bambola", "Doll" → tg-2-4 (Dolls & Accessories)
    • "Action figure", "Supereroe" → tg-2-1 (Action Figures & Playsets)
    • "Gioco tavolo", "Board game" → tg-1-1 (Board Games)
    • "Puzzle" → tg-1-3 (Puzzles)
    • "Drone giocattolo", "Toy drone" → tg-2-6 (Electronic Toys)
    • "Fumetti", "Comic books" → tg-3-4 (Comic Books) [2026 NEW] or ae-2-2-3 (Comic Books)
    • "Carte collezionabili", "Trading cards" → tg-3-1 (Collectible Cards)
    • "Sensory toys", "Giochi sensoriali" → tg-2-11 (Sensory Toys) [2026 NEW]
  
  ARTS & CRAFTS KEYWORDS:
    • "Chitarra", "Guitar" → ae-2-8-3 (Guitars)
    • "Piano", "Pianoforte" → ae-2-8-6 (Pianos)
    • "Batteria", "Drums" → ae-2-8-2 (Drums & Percussion)
    • "Violino", "Violin" → ae-2-8-7 (String Instruments)
    • "Sax", "Saxophone" → ae-2-8-8 (Woodwinds)
    • "Banjo", "Mandolino", "Ukulele" → ae-2-8-9 (Folk & World Instruments) [2026]
    • "Candele", "Candle making" → ae-2-1-4 (Olfactory Arts) [2026 NEW]
    • "Profumo fai da te", "Perfume making" → ae-2-1-4-2 (Perfume Making) [2026 NEW]
    • "Incenso", "Incense" → ae-2-1-4-3 (Incense Making) [2026 NEW]
  
  LUGGAGE & BAGS KEYWORDS:
    • "Zaino", "Backpack" → lb-1 (Backpacks) - specify type: hiking, laptop, school, military [2026]
    • "Valigia", "Luggage" → lb-3 (Luggage)
    • "Borsa laptop", "Laptop bag" → lb-4 (Laptop Bags) [2026 NEW]
    • "Borsa messenger", "Messenger bag" → lb-4-2 (Laptop Messengers) [2026 NEW]
  
  BUSINESS & INDUSTRIAL KEYWORDS:
    • "Trattore", "Tractor" → bi-1-1 (Agriculture Machinery) [2026 EXPANDED]
    • "Apicoltura", "Beekeeping" → bi-1-2 (Beekeeping) [2026 NEW]
    • "Smart farming", "Agricoltura smart" → bi-1-3 (Smart Farming) [2026 NEW]
    • "Gru", "Crane" → bi-2-2 (Heavy Machinery) [2026]
    • "Bettoniera", "Concrete mixer" → bi-2-2 (Heavy Machinery) [2026]
    • "Simulatore medico", "Medical simulator" → bi-3-3 (Medical Teaching Equipment) [2026 NEW]
  
  STEP 2: Analyze Product Image (if provided)
  - Visual features to detect:
    • High heel, stiletto, pump → aa-8-10 (Heels) ⭐
    • Flat sole, ballet style → aa-8-9 (Flats)
    • Baby/Toddler/Child size (small) + clothing features → aa-1-2 (Baby & Children's Clothing)
    • Baby shoes with soft soles → aa-8-2 (Baby & Children's Shoes)
    • Maternity features (stretch fabric, nursing access) → aa-1-7 (Maternity Clothing)
    • Wedding dress white gown → aa-1-22-2 (Wedding Dresses)
    • Lingerie style (lace, sheer) → aa-1-6 (Lingerie)
    • Medical scrubs style → aa-1-21-9 (Scrubs) [2026]
    • Electronics (screens, buttons, ports) → el categories
    • Furniture (legs, cushions, structure) → hg-5 categories
    • Plants/garden items → hg-6 categories
    • Sports equipment → sg categories
    • Vehicles/parts → vp categories
  
  STEP 3: Determine Exact Category ID
  - Match product to MOST SPECIFIC leaf node possible
  - Examples of correct ID selection:
    • "Tacchi donna neri 10cm" → aa-8-10 (Heels)
    • "Ballerine pelle beige" → aa-8-9 (Flats)
    • "Scarpine neonato" → aa-8-2 (Baby & Children's Shoes)
    • "Vestito bambina 3 anni" → aa-1-2-3 (Baby & Children's Dresses)
    • "Reggiseno allattamento" → aa-1-7-1 (Nursing Bras)
    • "Piumino uomo" → aa-1-10-2-9 (Puffer Jackets)
    • "Giacca bomber" → aa-1-10-2-2 (Bomber Jackets)
    • "Cuffie Bluetooth" → el-2-2 (Headphones & Headsets)
    • "Divano velluto" → hg-5-4 (Living Room Furniture)
    • "Drone con telecamera" → vp-3-1-2 (Drones) [2026]
    • "Auto ibrida" → vp-1-4 (Hybrid Vehicles) [2026]
    • "Zaino trekking" → lb-1-1 (Hiking Backpacks) [2026]
    • "Candela profumata" → ae-2-1-4-1 (Candle Making) [2026]
    • "Mascherina chirurgica" → hb-4-4 (Medical Face Masks) [2026]
  
  STEP 4: Build Full Category Object
  - id: EXACT gid://shopify/TaxonomyCategory/xx-x-x-x
  - name: Exact leaf node name from taxonomy
  - breadcrumb: Full path with " > " separators
  
  ═══════════════════════════════════════════════════════════════
  PLATFORM-SPECIFIC OPTIMIZATION RULES
  ═══════════════════════════════════════════════════════════════
  
  GOOGLE/Brave:
  Title: [Primary Keyword] + [Benefit] + [Brand] + [Year]
  Example: "Tacchi Donna Neri 10cm | Eleganti 2026 | Spedizione Gratis"
  
  Description: [Problem] + [Solution] + [Features] + [CTA]
  Example: "Scopri i tacchi donna neri da 10cm. Eleganti e comodi per serate speciali. Spedizione gratuita in 24h!"
  
  FACEBOOK:
  Title: "🔥 [Product] - [Benefit] | [Social Proof]"
  Description: "Adora questo [product]! ❤️ [Benefit 1], [Benefit 2]. Perfetto per [use case]. Tagga un amico! 👇"
  
  TIKTOK:
  Title: "[Trend] [Product] che [benefit] ✨ #[category] #[viral]"
  Description: "POV: Hai trovato il [product] che [risolve problema] 😍 Link in bio! #TikTokMadeMeBuyIt"
  
  PINTEREST:
  Title: "[Style] [Product] per [Occasion] | [Color] [Material]"
  Description: "Cerchi [solution]? Questo [product] è perfetto per [use case]! [Feature 1], [Feature 2]. Salva per dopo! #[category]"
  
  ═══════════════════════════════════════════════════════════════
  REAL EXAMPLES WITH VERIFIED CATEGORY IDs
  ═══════════════════════════════════════════════════════════════
  
  EXAMPLE 1 - Women's Heels (Tacchi Donna):
  Input: "Tacchi Donna Neri 10cm Eleganti in Pelle"
  {
    "id": "gid://shopify/Product/12345",
    "seoTitle": "Tacchi Donna Neri 10cm | Eleganti in Pelle 2026",
    "seoDescription": "Tacchi donna neri da 10cm in pelle. Eleganti e comodi per serate e cerimonie. Suola antiscivolo, spedizione gratuita in 24h!",
    "handle": "tacchi-donna-neri-10cm-eleganti-pelle",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/aa-8-10",
      "name": "Heels",
      "breadcrumb": "Apparel & Accessories > Shoes > Heels"
    },
    "productType": "High Heels",
    "attributes": {
      "color": "black",
      "material": "leather",
      "targetGender": "women",
      "size": null,
      "pattern": "solid"
    },
    "socialOptimization": {
      "facebookTitle": "🔥 Tacchi Neri 10cm - Eleganza & Stile | Best Seller",
      "facebookDescription": "L'eleganza è nei dettagli! ✨ Questi tacchi neri da 10cm sono pura classe. Chi altro li vuole? 👇",
      "tiktokTitle": "I tacchi che ti fanno sentire REGINA 👠✨ #Tacchi #Eleganza #Shoes",
      "pinterestTitle": "Tacchi Donna Neri 10cm Eleganti | Scarpe Cerimonia Pelle",
      "pinterestDescription": "Tacchi donna neri da 10cm in pelle, perfetti per cerimonie e serate eleganti. Suola antiscivolo, tacco stabile. #Tacchi #ScarpeDonna #Eleganza #Cerimonia"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Tacchi Donna Neri 10cm Eleganti in Pelle",
      "description": "Tacchi donna neri da 10cm in pelle, eleganti e comodi",
      "brand": null,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock "
      }
    }
  }
  
  EXAMPLE 2 - Baby Shoes (Scarpine Bambino) - 2026 UPDATE:
  Input: "Scarpine Primi Passi Bambino Bianche Suola Morbida"
  {
    "id": "gid://shopify/Product/67890",
    "seoTitle": "Scarpine Primi Passi Bambino | Suola Morbida 2026",
    "seoDescription": "Scarpine primi passi bambino bianche con suola morbida. Leggere, flessibili e sicure per i primi passi del tuo bimbo. Spedizione gratis!",
    "handle": "scarpine-primi-passi-bambino-bianche",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/aa-8-2-6",
      "name": "First Steps & Crawlers",
      "breadcrumb": "Apparel & Accessories > Shoes > Baby & Children's Shoes > First Steps & Crawlers"
    },
    "productType": "Baby Shoes",
    "attributes": {
      "color": "white",
      "material": "cotton",
      "targetGender": "unisex",
      "size": "18",
      "pattern": "solid"
    },
    "socialOptimization": {
      "facebookTitle": "👶 Scarpine Primi Passi - Delicate & Sicure | Neonati",
      "facebookDescription": "I primi passi meritano il meglio! 🍼 Suola morbida e materiali sicuri. Tagga una mamma! 👇",
      "tiktokTitle": "Le scarpine perfette per i primi passi 👶✨ #BabyShoes #PrimiPassi #Mamma",
      "pinterestTitle": "Scarpine Primi Passi Bambino Bianche | Suola Morbida Sicura",
      "pinterestDescription": "Scarpine primi passi bambino bianche, suola morbida e flessibile. Ideali per i primi passi, materiali anallergici e traspiranti. #BabyShoes #PrimiPassi #Neonato"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Scarpine Primi Passi Bambino Bianche",
      "description": "Scarpine primi passi bambino con suola morbida",
      "brand": null,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock "
      }
    }
  }
  
  EXAMPLE 3 - Drone (2026 NEW CATEGORY):
  Input: "Drone DJI Mini 4 Pro con Telecamera 4K"
  {
    "id": "gid://shopify/Product/11111",
    "seoTitle": "Drone DJI Mini 4 Pro | Telecamera 4K 2026",
    "seoDescription": "Drone DJI Mini 4 Pro con telecamera 4K. Leggero, compatto, autonomia 34min. Ideale per fotografia aerea. Spedizione gratuita!",
    "handle": "drone-dji-mini-4-pro-telecamera-4k",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/vp-3-1-2",
      "name": "Drones",
      "breadcrumb": "Vehicles & Parts > Aircraft > Heavier-Than-Air Aircraft > Drones"
    },
    "productType": "Consumer Drone",
    "attributes": {
      "color": "gray",
      "material": "plastic",
      "targetGender": "unisex",
      "size": null,
      "pattern": null
    },
    "socialOptimization": {
      "facebookTitle": "🚁 Drone DJI Mini 4 Pro - Riprese Aeree 4K | Best Seller",
      "facebookDescription": "Cattura il mondo dall'alto! 🌍 Drone DJI Mini 4 Pro con video 4K. Chi sogna di volare? 👇",
      "tiktokTitle": "Il drone che trasforma le tue riprese 😱✨ #Drone #DJI #Tech",
      "pinterestTitle": "Drone DJI Mini 4 Pro 4K | Fotografia Aerea Professionale",
      "pinterestDescription": "Drone DJI Mini 4 Pro con telecamera 4K, leggero e compatto. Autonomia 34 minuti, trasmissione video fino a 20km. Perfetto per content creator. #Drone #DJI #Fotografia #Tech"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Drone DJI Mini 4 Pro",
      "description": "Drone DJI Mini 4 Pro con telecamera 4K",
      "brand": "DJI",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock "
      }
    }
  }
  
  EXAMPLE 4 - Hybrid Car (2026 NEW CATEGORY):
  Input: "Toyota Prius Hybrid 2026"
  {
    "id": "gid://shopify/Product/22222",
    "seoTitle": "Toyota Prius Hybrid 2026 | Eco-Friendly",
    "seoDescription": "Toyota Prius Hybrid 2026. Massima efficienza, bassi consumi, tecnologia avanzata. Scopri l'offerta!",
    "handle": "toyota-prius-hybrid-2026",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/vp-1-4",
      "name": "Hybrid Vehicles",
      "breadcrumb": "Vehicles & Parts > Cars, Trucks & Vans > Hybrid Vehicles"
    },
    "productType": "Hybrid Car",
    "attributes": {
      "color": "silver",
      "material": null,
      "targetGender": "unisex",
      "size": null,
      "pattern": null
    },
    "socialOptimization": {
      "facebookTitle": "🌱 Toyota Prius Hybrid - Eco & Tecnologia | 2026",
      "facebookDescription": "Guida il futuro! 🚗 Hybrid technology per un mondo più green. Chi ama l'ambiente? 👇",
      "tiktokTitle": "L'auto ibrida che cambia tutto 🔋✨ #Hybrid #Toyota #EcoFriendly",
      "pinterestTitle": "Toyota Prius Hybrid 2026 | Auto Ecologica Tecnologica",
      "pinterestDescription": "Toyota Prius Hybrid 2026, massima efficienza energetica e tecnologia avanzata. Perfetta per chi cerca un'auto eco-friendly senza compromessi. #Hybrid #Toyota #AutoIbrida #Green"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Toyota Prius Hybrid 2026",
      "description": "Toyota Prius Hybrid 2026 eco-friendly",
      "brand": "Toyota",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock "
      }
    }
  }
  
  EXAMPLE 5 - Scented Candle (2026 NEW OLFACTORY ARTS):
  Input: "Candela Profumata Vaniglia Fatta a Mano"
  {
    "id": "gid://shopify/Product/33333",
    "seoTitle": "Candela Profumata Vaniglia | Fatta a Mano 2026",
    "seoDescription": "Candela profumata alla vaniglia fatta a mano. Cera naturale, stoppino in cotone, durata 40 ore. Regalo perfetto!",
    "handle": "candela-profumata-vaniglia-fatto-mano",
    "category": {
      "id": "gid://shopify/TaxonomyCategory/ae-2-1-4-1",
      "name": "Candle Making",
      "breadcrumb": "Arts & Entertainment > Arts & Crafts > Olfactory Arts > Candle Making"
    },
    "productType": "Scented Candle",
    "attributes": {
      "color": "cream",
      "material": "soy wax",
      "targetGender": "unisex",
      "size": "medium",
      "pattern": null
    },
    "socialOptimization": {
      "facebookTitle": "🕯️ Candela Vaniglia - Fatta a Mano | Relax",
      "facebookDescription": "Profumo di casa! 🏠 Candela alla vaniglia fatta a mano con amore. Chi ama le candele? 👇",
      "tiktokTitle": "La candela che profuma tutta casa 😍✨ #Candele #Vaniglia #HomeDecor",
      "pinterestTitle": "Candela Profumata Vaniglia Fatta a Mano | Cera Naturale",
      "pinterestDescription": "Candela profumata alla vaniglia fatta a mano con cera naturale e stoppino in cotone. Durata 40 ore, profumazione intensa. Ideale per regalo o arredo casa. #Candele #HomeDecor #FattoAMano #Vaniglia"
    },
    "schemaOrg": {
      "@type": "Product",
      "name": "Candela Profumata Vaniglia Fatta a Mano",
      "description": "Candela profumata alla vaniglia fatta a mano, cera naturale",
      "brand": null,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock "
      }
    }
  }
  
  ═══════════════════════════════════════════════════════════════
  INPUT DATA TO PROCESS
  ═══════════════════════════════════════════════════════════════
  
  ${JSON.stringify(chunk, null, 2)}
  
  ═══════════════════════════════════════════════════════════════
  CRITICAL RULES - MANDATORY COMPLIANCE
  ═══════════════════════════════════════════════════════════════
  
  1. category.id: MUST be exact Shopify GID format: gid://shopify/TaxonomyCategory/[code]
     - Use the MOST SPECIFIC leaf node available (deepest level)
     - CRITICAL CODES FOR THIS REQUEST:
       • Heels/Tacchi: gid://shopify/TaxonomyCategory/aa-8-10 ⭐
       • Flats/Ballerine: gid://shopify/TaxonomyCategory/aa-8-9
       • Baby & Children's Shoes: gid://shopify/TaxonomyCategory/aa-8-2 [2026 UPDATE]
       • First Steps: gid://shopify/TaxonomyCategory/aa-8-2-6
       • Baby & Children's Clothing: gid://shopify/TaxonomyCategory/aa-1-2 [2026 UPDATE]
       • Baby & Children's Dresses: gid://shopify/TaxonomyCategory/aa-1-2-3
       • Toddler Underwear: gid://shopify/TaxonomyCategory/aa-1-2-11 [2026 NEW]
       • Maternity: gid://shopify/TaxonomyCategory/aa-1-7
       • Wedding Dresses: gid://shopify/TaxonomyCategory/aa-1-22-2
       • Scrubs: gid://shopify/TaxonomyCategory/aa-1-21-9 [2026 RELOCATION]
       • Drones: gid://shopify/TaxonomyCategory/vp-3-1-2 [2026 NEW]
       • Hybrid Vehicles: gid://shopify/TaxonomyCategory/vp-1-4 [2026 NEW]
       • Candle Making: gid://shopify/TaxonomyCategory/ae-2-1-4-1 [2026 NEW]
       • Windfoiling: gid://shopify/TaxonomyCategory/sg-4-6 [2026 NEW]
       • Wingfoiling: gid://shopify/TaxonomyCategory/sg-4-7 [2026 NEW]
       • Curling: gid://shopify/TaxonomyCategory/sg-5-3 [2026 NEW]
       • Hydroponics: gid://shopify/TaxonomyCategory/hg-6-6 [2026 NEW]
       • Closet Parts: gid://shopify/TaxonomyCategory/hg-5-7 [2026 NEW]
       • Medical Face Masks: gid://shopify/TaxonomyCategory/hb-4-4 [2026 NEW]
       • Cannabis Products: gid://shopify/TaxonomyCategory/fb-3-2 [2026 NEW]
  
  2. category.name: Exact leaf node name (e.g., "Heels" not just "Shoes")
  
  3. category.breadcrumb: Full path with > separators (e.g., "Apparel & Accessories > Shoes > Heels")
  
  4. productType: Should match the specific product type, can be more specific than category.name
  
  5. seoTitle: 50-60 chars, primary keyword first, NO emojis, NO all caps
  
  6. seoDescription: 150-160 chars, compelling CTA, NO emojis
  
  7. socialOptimization: Platform-appropriate with emojis allowed
  
  8. attributes: Extract from input data, use null if not found
  
  9. schemaOrg: Valid JSON-LD structured data
  
  10. Output: Return ONLY valid JSON array - no markdown, no explanations
  
  11. Array length: Must exactly match input: ${chunk.length}
  
  12. Language: Match the input product title/description language (Italian in your example)
  
  13. If image URL provided: Analyze visual features to CONFIRM or REFINE category selection
  
  14. 2026 TAXONOMY UPDATES: Use updated category names (Baby & Children's instead of Baby & Toddler) but GIDs remain stable
  
  ═══════════════════════════════════════════════════════════════
  BEGIN PROCESSING:`;
  }
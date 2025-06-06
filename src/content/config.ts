import { defineCollection, z } from 'astro:content';

const beadTypes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['glass', 'metal', 'stone', 'ceramic', 'wood', 'plastic', 'findings', 'vintage']),
    subcategory: z.string().optional(),
    materials: z.array(z.string()),
    colours: z.array(z.string()),
    shapes: z.array(z.string()),
    sizes: z.array(z.string()),
    origin: z.string().optional(),
    techniques: z.array(z.string()),
    uses: z.array(z.string()),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    priceRange: z.enum(['budget', 'mid-range', 'premium', 'luxury']),
    suppliers: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
      location: z.string()
    })).optional(),
    relatedBeads: z.array(z.string()).optional(),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional()
    })),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    published: z.boolean().default(true),
    lastUpdated: z.date()
  })
});

const tutorials = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    timeRequired: z.string(),
    materialsNeeded: z.array(z.string()),
    toolsRequired: z.array(z.string()),
    beadTypesUsed: z.array(z.string()),
    techniques: z.array(z.string()),
    category: z.enum(['necklaces', 'bracelets', 'earrings', 'rings', 'brooches', 'general']),
    featuredImage: z.string(),
    gallery: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      step: z.number().optional()
    })),
    supplyCost: z.enum(['under-10', '10-25', '25-50', 'over-50']),
    tags: z.array(z.string()),
    published: z.boolean().default(true),
    featured: z.boolean().default(false),
    lastUpdated: z.date()
  })
});

const suppliers = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    website: z.string().url(),
    location: z.string(),
    specialty: z.array(z.string()),
    shippingAreas: z.array(z.string()),
    priceRange: z.enum(['budget', 'mid-range', 'premium']),
    beadTypes: z.array(z.string()),
    rating: z.number().min(1).max(5).optional(),
    contact: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional()
    }),
    features: z.array(z.string()),
    tags: z.array(z.string()),
    verified: z.boolean().default(false),
    featured: z.boolean().default(false),
    published: z.boolean().default(true),
    lastUpdated: z.date()
  })
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    heroImage: z.string().optional(),
    category: z.enum(['news', 'tips', 'inspiration', 'community']),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    published: z.boolean().default(true)
  })
});

export const collections = {
  'bead-types': beadTypes,
  'tutorials': tutorials,
  'suppliers': suppliers,
  'posts': posts
};
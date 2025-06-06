import Fuse from 'fuse.js';
import { getCollection } from 'astro:content';

export async function createSearchIndex() {
  // Get all content
  const [beadTypes, tutorials, suppliers, posts] = await Promise.all([
    getCollection('bead-types', ({ data }) => data.published),
    getCollection('tutorials', ({ data }) => data.published),
    getCollection('suppliers'),
    getCollection('posts', ({ data }) => data.published)
  ]);

  // Create search documents
  const searchDocuments = [
    ...beadTypes.map(item => ({
      id: item.slug,
      title: item.data.title,
      description: item.data.description,
      content: item.body,
      category: 'bead-type',
      tags: item.data.tags,
      url: `/bead-types/${item.slug}`,
      meta: {
        category: item.data.category,
        difficulty: item.data.difficulty,
        origin: item.data.origin
      }
    })),
    ...tutorials.map(item => ({
      id: item.slug,
      title: item.data.title,
      description: item.data.description,
      content: item.body,
      category: 'tutorial',
      tags: item.data.tags,
      url: `/tutorials/${item.slug}`,
      meta: {
        difficulty: item.data.difficulty,
        timeRequired: item.data.timeRequired,
        category: item.data.category
      }
    })),
    ...suppliers.map(item => ({
      id: item.slug,
      title: item.data.name,
      description: item.data.description,
      content: item.body,
      category: 'supplier',
      tags: item.data.tags,
      url: `/suppliers/${item.slug}`,
      meta: {
        location: item.data.location,
        priceRange: item.data.priceRange,
        verified: item.data.verified
      }
    })),
    ...posts.map(item => ({
      id: item.slug,
      title: item.data.title,
      description: item.data.description,
      content: item.body,
      category: 'blog',
      tags: item.data.tags,
      url: `/blog/${item.slug}`,
      meta: {
        category: item.data.category,
        pubDate: item.data.pubDate
      }
    }))
  ];

  return searchDocuments;
}

export function createFuseIndex(documents: any[]) {
  const options = {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'tags', weight: 0.2 },
      { name: 'content', weight: 0.1 }
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true
  };

  return new Fuse(documents, options);
}

export function searchContent(query: string, documents: any[], limit = 10) {
  const fuse = createFuseIndex(documents);
  const results = fuse.search(query, { limit });
  
  return results.map(result => ({
    ...result.item,
    score: result.score,
    matches: result.matches
  }));
}
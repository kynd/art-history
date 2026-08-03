import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // Optional topic slugs — used to seed/label preset chips. Ranking itself is
    // embedding-based, not tag-based. The article's SUMMARY is its first paragraph
    // (extracted at build time), so there is no summary field to keep in sync.
    topics: z.array(z.string()).optional(),
    // Editorial dates (YYYY-MM-DD). `created` = originally made; `updated` = last
    // meaningfully edited (bump on real content edits, not typo/wording sweeps).
    // The article page shows `updated`; the homepage sorts by it.
    created: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { articles };

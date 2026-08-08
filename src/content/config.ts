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
    // Editor-mode fields. `draft: true` pages are built and indexed ONLY in editor mode
    // (local `astro dev`), never in the public build. `editorNote` is shown only in editor
    // mode. Both are stripped from the deployed site so nothing leaks.
    draft: z.boolean().default(false),
    editorNote: z.string().optional(),
  }),
});

export const collections = { articles };

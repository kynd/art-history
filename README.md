# Art Research

A minimal static site for researching art history through short essays, discoverable by
**semantic search** (embeddings) and by the **relationships between essays**. Sister
project to `art_history`; same Astro stack and visual language.

See [SPEC.md](SPEC.md) for the full design rationale.

## How it works

- Essays are `.md` files in `src/content/articles/`. **The first paragraph is the summary.**
- A build step (`scripts/build-index.mjs`) embeds every essay with a local model
  (`Xenova/all-MiniLM-L6-v2`) and writes `public/search-index.json`, `public/related.json`,
  and `public/topics.json`.
- The homepage embeds your query **in the browser** (same model, ~23 MB one-time download,
  then cached) and ranks essays by cosine similarity. No server, no API key.
- Preset topic chips carry precomputed vectors, so they rank instantly without the download.
- Each essay page shows a precomputed **Related** column.

## Commands

```bash
npm install
npm run reindex   # (re)generate embeddings — run after adding/editing essays
npm run dev       # start the dev server (uses the last-built index)
npm run build     # reindex + static build into dist/
```

## Adding an essay

Essays are **bilingual** (English + Japanese). English and Japanese paragraphs are paired
and separated by a `<!-- -->` comment; headings come in EN/JA pairs; sections are separated
by `---`. The English first paragraph is the summary used for search and embeddings.

1. Create `src/content/articles/<slug>.md`:
   ```markdown
   ---
   title: "English Title  日本語タイトル"
   topics: ["optional", "slugs"]
   ---

   English summary (first paragraph — used in search results and embeddings).

   <!-- -->

   日本語の要約。

   ---

   ## English Heading
   ## 日本語見出し

   English paragraph.

   <!-- -->

   日本語の段落。
   ```
2. Run `npm run reindex` (regenerates embeddings + related links).
3. `npm run dev` to preview.

Notes: keep **one** English paragraph followed by **one** Japanese paragraph per section
(the `<!-- -->` separates them). The build indexer extracts the first non-heading English
paragraph as the summary, so keep English first.

To add a preset chip, edit `src/data/topics.mjs` and reindex.

# Art Research — Spec & Implementation Plan

A minimalist, static website for researching art history through short AI-written
articles, discoverable by **semantic (embedding-based) search** and by the
**relationships between topics**.

Built to match the visual language and stack of the sibling `art_history` project
(Astro, static output, deployed to GitHub Pages).

---

## 1. Goals

1. **Author** short articles as `.md` files. Written by me (Claude) on request. Each
   article's **first paragraph is its summary**.
2. **Discover by meaning, not keywords.** The homepage has a text input plus a set of
   preset topic chips. Typing a query or picking a topic ranks articles by *semantic
   similarity*, not literal string matching.
3. **Browse by relationship.** Opening an article shows the full text, with a sidebar
   listing the most closely related articles.
4. **Stay minimal.** Same restrained typography, generous whitespace, and neutral
   palette as `art_history`.

### Non-goals (v1)

- No user accounts, comments, or server-side database.
- No full CMS — articles are plain `.md` files edited in the repo.
- No live web crawling; content is authored deliberately.

---

## 2. The core constraint: it must stay static

`art_history` builds to static HTML and deploys to GitHub Pages — there is **no
backend**. Semantic search normally needs a server to (a) hold the vector index and
(b) embed the user's live query. We keep both on the client:

- **Article vectors are precomputed at build time** and shipped as a JSON file.
- **The query is embedded in the browser** using a small embedding model that runs
  locally via [`transformers.js`](https://huggingface.co/docs/transformers.js) (WASM /
  WebGPU). No API key, no server, no per-query cost.
- **Similarity ranking is plain cosine similarity** in JavaScript over a few hundred
  vectors — trivially fast.

This keeps the whole thing free, private, and deployable to GitHub Pages exactly like
the reference project.

### Recommended embedding model

`Xenova/all-MiniLM-L6-v2` — 384-dimensional, ~23 MB quantized (int8), the de-facto
standard for in-browser semantic search. Good quality for short-text similarity.

**Tradeoff to accept:** the browser downloads the model (~23 MB) on first search, then
caches it (IndexedDB/Cache API). Subsequent searches are instant. The homepage is fully
usable before then — search just shows a one-time "loading model…" state. If we ever
want to avoid the download entirely we can fall back to build-time-only precomputed
neighbors (relationships still work), but live free-text search needs the client model.

---

## 3. Content model

### Article file

Articles live in an Astro content collection, e.g. `src/content/articles/*.md`.

```markdown
---
title: "The Readymade and the Ordinary Object  レディメイドと日用品"
topics: ["duchamp", "conceptual-art", "objecthood"]   # optional, for chip seeding
---

Marcel Duchamp's readymades collapsed the distance between art and the manufactured
object, and in doing so reframed the *decision* to designate something as art as the
creative act itself. (← this first paragraph is the summary)

## Background
...rest of the article...
```

Conventions:

- **`title`** — required. May be bilingual (English + Japanese) like `art_history`;
  the layout splits on the first CJK character (reuse `splitTitle`).
- **First paragraph = summary.** Extracted automatically at build time (no separate
  frontmatter field to keep in sync). Used in result lists and related-article lists.
- **`topics`** — optional array of slugs. Used only to seed / label the preset chips and
  as a light metadata signal; ranking itself is embedding-based, not tag-based.

### Preset topics (homepage chips)

A small curated list (config file `src/data/topics.ts`), e.g.
`Abstraction`, `The Readymade`, `Regional & Folk Art`, `Color`, `Modernism`,
`Materiality`. Each chip is just a canned query string that gets embedded like any typed
query. Optionally we precompute each chip's vector at build time so chip clicks are
instant even before the model loads.

---

## 4. How search & relationships work

### At build time (Node script, `scripts/build-index.mjs`)

1. Read every article `.md`.
2. Extract `title`, first-paragraph `summary`, `topics`, `slug`, plaintext `body`.
3. Compute an embedding for each article from `title + summary` (optionally + body).
   Use `transformers.js` in Node with the *same* model as the client.
4. Precompute, for each article, its **top-N related articles** (cosine similarity over
   the article vectors). This makes the article-page sidebar zero-cost at runtime.
5. Write two artifacts to `public/`:
   - `search-index.json` — `[{ slug, title, summary, topics, vector }]` for live search.
   - `related.json` — `{ [slug]: [{ slug, title, summary, score }] }` for sidebars.
   - `topics.json` — preset chips with their precomputed vectors.

This script runs as a `prebuild` step (`npm run build` → build-index → astro build) and
can also run in the GitHub Action.

### At runtime (browser, homepage)

1. On first interaction, lazy-load the embedding model via `transformers.js`.
2. Embed the current query (typed text or clicked chip).
3. Cosine-similarity against every article vector in `search-index.json`.
4. Render a ranked list of **title + summary only** (threshold + top-K cap).
5. Debounce typing (~200 ms). Empty query → show all / recent articles.

### At runtime (article page)

- Render the markdown (reusing the `art_history` prose styles).
- Read `related.json[slug]` and render the related list in a side column — **no model
  needed**, so it works instantly and even with JS disabled if server-rendered.

---

## 5. Pages & layout

```
/                      Homepage: search input + topic chips + live results list
/articles/[slug]       Article view + related-articles side column
```

### Homepage (`src/pages/index.astro`)

- Centered heading (site title, EN + JA), matching `art_history`'s `.page-title`.
- **Search input** — large, minimal, single underline or thin border; placeholder like
  "Search by idea, movement, or feeling…".
- **Topic chips** — a wrapped row of small pill buttons below the input.
- **Results** — a plain list; each item is a linked **title** with the **summary** in
  muted text (`--fg-muted`). No thumbnails, no cards — just typographic hierarchy.
- Model-loading and empty states are quiet inline text.

### Article page (`src/pages/articles/[slug].astro`)

- Two-column at desktop width: main prose column (max ~720–860px) + a narrower right
  **"Related"** column listing related titles + one-line summaries.
- Collapses to single column on mobile (related list moves below the article).
- Reuse the `art_history` topbar (sidebar toggle optional), font switcher, breadcrumb,
  and AI-disclaimer patterns as desired.

---

## 6. Visual design (inherited from `art_history`)

Reuse the exact design tokens so the two sites feel like one family:

```css
:root {
  --bg: #ffffff;
  --fg: #343434;
  --fg-muted: #777777;
  --border: #e8e8e8;
  --link: rgb(49, 113, 222);
  --font-body: 'Sora', 'Noto Sans JP', sans-serif;   /* sans */
  --font-code: 'Google Sans Code', 'Fira Mono', monospace;
}
html[data-font="serif"] { --font-body: 'Lora', 'Noto Serif JP', serif; }
```

- Base `18px / 1.7`, Lora (serif) ↔ Sora (sans) font toggle, bilingual title handling.
- Generous margins, thin `1px` borders, no shadows except the sidebar's soft one.
- Chips: minimal outline pills, muted by default, `--fg` on hover/active.
- Lift the shared CSS block from `art_history`'s `DocLayout.astro` into a small shared
  layout to avoid drift.

---

## 7. Tech stack

| Concern            | Choice                                                        |
|--------------------|--------------------------------------------------------------|
| Framework          | Astro 4 (matches `art_history`), `output: 'static'`          |
| Content            | Astro content collections, `.md` in `src/content/articles`   |
| Markdown           | Same remark/rehype setup (math, link rebasing) as reference  |
| Embeddings         | `@xenova/transformers` (`all-MiniLM-L6-v2`), build + browser |
| Search index       | Static `search-index.json` / `related.json` in `public/`     |
| Ranking            | Cosine similarity in plain JS (no vector DB)                  |
| Deploy             | GitHub Pages via `withastro/action` (same workflow)          |

---

## 8. Repository layout (target)

```
art_research/
  astro.config.mjs
  package.json
  scripts/
    build-index.mjs          # generate embeddings + related.json
  src/
    content/
      config.ts              # articles collection schema
      articles/
        *.md                 # the research articles
    data/
      topics.ts              # preset chip definitions
    layouts/
      BaseLayout.astro       # shared shell + design tokens (from art_history)
    components/
      SearchBox.astro / .ts  # input + chips + results (client island)
      RelatedList.astro      # article-page side column
    pages/
      index.astro
      articles/[slug].astro
  public/
    search-index.json        # generated (gitignored or committed)
    related.json             # generated
    topics.json              # generated
```

---

## 9. Implementation plan (phased)

**Phase 0 — Scaffold**
- Init Astro project, copy design tokens + fonts + base layout from `art_history`.
- Set up content collection + 3–4 seed articles (so search has something to rank).

**Phase 1 — Authoring flow**
- Define frontmatter schema; write the "first paragraph = summary" extractor.
- Article page renders markdown with the shared prose styles.

**Phase 2 — Build-time index**
- `scripts/build-index.mjs`: embed articles, write `search-index.json` + `related.json`
  + `topics.json`. Wire as `prebuild`.

**Phase 3 — Semantic search UI**
- Homepage search box + chips. Lazy-load model, embed query, cosine-rank, render
  title+summary results. Debounce, thresholds, loading/empty states.

**Phase 4 — Relationships**
- Article-page "Related" column from `related.json`.

**Phase 5 — Polish & deploy**
- Mobile layout, font toggle, breadcrumb, empty/error states.
- GitHub Pages workflow (mirroring `art_history`), set `base`.

---

## 10. Open decisions

1. **Embedding approach** — recommended: **client-side `transformers.js`** (fully
   static, free, private; ~23 MB one-time model download). Alternative: build-time
   embeddings only (relationships work; live free-text search would need a hosted API +
   key, which breaks the static/free model). *Recommendation: client-side.*
2. **Embed body or just title+summary?** — title+summary is cheaper and usually sharper
   for short-article similarity; body can be added if recall feels thin.
3. **Commit generated JSON or generate in CI?** — generating in the GitHub Action keeps
   the repo clean; committing makes local preview trivial. *Recommendation: generate in
   CI, gitignore the JSON.*
4. **Reuse the collapsible left sidebar** from `art_history`, or lead with search only?
   *Recommendation: search-first homepage; keep the article-page related column.*

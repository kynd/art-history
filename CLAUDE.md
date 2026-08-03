# CLAUDE.md — Art Research

A minimalist static **Astro** site for art & world-history research essays, discoverable by
**client-side semantic search** (embeddings) and by the relationships between essays. Sister
project to `../art_history` — reuse its visual language. See `SPEC.md` and `README.md`.

## Rules for making or editing pages

Apply **all** of these every time you create or edit a page or article.

### 0. Follow the Editorial Policy and Writing Style (and maintain them)

Before writing or editing **any** essay content, read and follow:
- **Editorial Policy** — `src/pages/policy.md` (curation: neutrality, breadth, honesty, sensitivity)
- **Writing Style** — `src/pages/style.md` (voice, jargon, sentences, emphasis, punctuation, Japanese)

These are **living documents**. When the user gives new guidance on curation or wording — or
when a consistent new convention emerges — update `policy.md` / `style.md` to capture it, and
keep existing essays consistent with them. Treat them as the source of truth for editorial
decisions; this file (CLAUDE.md) covers the mechanical/format rules below.

**Japanese style note (from `style.md`):** use plain polite endings (ました／でした／です) and
**avoid the heavy explanatory ending 〜のです** (write 「変えました」 not 「変えたのです」). Use a
**single** dash 「—」, never a doubled 「——」.

### 0b. Log substantial content changes

After any **large** change to essay content — adding or removing essays, substantial rewrites,
new sections or decades, or reworking coverage — prepend a dated entry (newest at top) to
`src/pages/changes.md` with a short **bilingual** (EN + JA) summary. Do **not** log minor or
stylistic edits (typos, wording, punctuation, formatting).

### 1. Articles are bilingual (English + Japanese)

Every essay in `src/content/articles/*.md` must be fully bilingual, in this exact format:

```markdown
---
title: "English Title  日本語タイトル"
created: 2026-08-02
updated: 2026-08-02
topics: ["optional", "slugs"]
---

English summary (first paragraph — also used as the search snippet and for embeddings).

<!-- -->

日本語の要約。

---

## English Heading
## 日本語見出し

English paragraph.

<!-- -->

日本語の段落。
```

- **English paragraph, then `<!-- -->`, then the Japanese paragraph.** Keep **one** EN
  paragraph + **one** JA paragraph per section (the `<!-- -->` separates the pair).
- **Headings come in pairs**: `## English` immediately followed by `## 日本語`.
- **Sections are separated by `---`.**
- The **first English paragraph is the summary** — keep English first; the indexer extracts
  the first non-heading English block.
- Titles are `"English  日本語"` (split on the first CJK character by the layout).
- **Dates:** set `created` and `updated` (YYYY-MM-DD) on every new article to today. When you make
  a **meaningful content edit** to an existing article, bump its `updated` to today (do NOT bump it
  for pure typo/wording/formatting sweeps). The article page shows `updated` under the title, and
  the homepage lists essays **most-recently-edited first**.

### 2. Content depth (history & art essays)

Decade/overview essays call out, per section: canonical textbook events; Japan; other
noteworthy events; driving forces & connections; and science/technology/philosophy/music/
pop culture. **Art essays also** cover design, architecture, music, film, and manga/anime,
and **name prominent figures and their key works** in each section.

### 3. Capture index terms (keeps index pages + in-prose links in sync)

When you add or edit an article, capture any **new** decade/era, artist/designer/architect/
director/maker, or movement/keyword in **`src/data/index-terms.mjs`** (`CHRONOLOGY`,
`ARTISTS`, `KEYWORDS`). This single file feeds three things:

- the `/chronology`, `/people`, `/keyword` index pages, and
- the **in-prose auto-linker** (BaseLayout wraps the first occurrence of each term inside
  `.prose` in a clickable link), so
- **every such word triggers a semantic search** on click.

For each entry set `label` (shown + default query), optional `query` (semantic string), and
`aliases` (extra match strings for the auto-linker — include surnames and the Japanese form).

Auto-linker behavior to keep in mind when curating aliases:
- Latin aliases match **case-insensitively** with letter boundaries (so label "Pop Art"
  matches "Pop art"); **all-caps acronyms** (BIG, OMA, AKIRA) stay case-sensitive so they
  don't match common words. Each term links **once per page** (first occurrence).
- Japanese **person** aliases auto-extend across the katakana run, so a surname alias grows
  to the full name (ニューマン → バーネット・ニューマン) — you usually don't need to add full
  katakana names, just the surname.
- Avoid ambiguous short aliases shared by two people (e.g. bare ラング for both Lange and
  Lang) — use the full Japanese name instead. Don't put a movement alias (Gutai, Metabolism,
  Superflat) on a person entry when that movement is also its own KEYWORD.
- The linker auto-rejects partial-word matches, so you usually don't need to worry about them:
  a katakana alias inside a longer katakana word (リベラ in リベラル) and a Japanese alias
  followed by 的/化/性/家/派 (具体 in 具体的) are skipped. Katakana person aliases extend leftward
  only, to absorb a preceding given name.
- Set `noLink: true` on a term that is a common word (e.g. "Contemporary") so it still shows
  on the index page but is excluded from the in-prose auto-linker.

### 4. Everything clickable searches semantically

Any element with a **`data-search="…"`** attribute triggers the global semantic search on
click (see BaseLayout). Use it for chips, index-page terms, etc. `window.artSearch(query)`
is the programmatic entry point.

### 5. Search architecture (don't break it)

- The **search box lives in the global header** (`BaseLayout.astro`) and works on every page.
- `<main>` holds `#page-view` (the page slot) and `#search-view`. Typing (or a `data-search`
  click) **replaces page content with results**; clearing restores it.
- Search is **client-side** and **hybrid**: `public/search-index.json` ships each essay's
  precomputed vector **and** its full lowercased plaintext. The query is embedded in-browser
  (`Xenova/all-MiniLM-L6-v2`) for semantic similarity, combined with a lexical full-text match
  (`score = semantic + 0.5·lexical`) so a person/movement/year named anywhere in the body is
  always findable — bare proper-noun clicks must return the essays that mention them. Keep it
  fully static — no server, no API keys.
- The three index pages share `src/components/TermIndex.astro` (plain-text, middot-separated
  terms — no pills — with a sort toggle between the grouped view and flat A–Z). The People
  page (`/people`, 人物) covers artists/designers/architects/makers, not only "artists".

### 6. Design (match `art_history`)

Reuse the tokens in BaseLayout: `--bg #ffffff`, `--fg #343434`, `--fg-muted #777`,
`--border #e8e8e8`, `--link rgb(49,113,222)`; Lora (serif) ↔ Sora (sans) via the font toggle;
Noto Serif/Sans JP for Japanese; 18px / 1.7. Minimal: thin 1px borders, generous whitespace,
no shadows/cards. Titles split EN/JA on the first CJK character.

### 7. After editing content — reindex

Run **`npm run reindex`** after adding or editing any article (regenerates
`public/search-index.json`, `related.json`, `topics.json`). Then verify in the browser.

### 8. Cross-checking related pages — only when explicitly asked

Reconciling a draft with its related pages is a deliberate, **lengthy and costly** pass (it loads
the embedding model and reads several essays). Run it **only when the user explicitly asks** to
"cross-check", "review", or "update related pages" for a draft — **never** automatically as part
of adding or editing an essay. Follow the **`related-pages`** skill. In short:

- Find neighbors with the helper: **`npm run related -- <path-to-draft.md> [topN]`** — it embeds the
  draft with the site's model and ranks existing articles by semantic similarity, listing shared
  curated index-terms (cross-linking candidates). Read the top matches.
- Review draft + neighbors together for contradictions, terminology drift, cross-linking, and
  policy/style fit.
- **Redundancy is not only about cutting overlap (hub-and-spoke):** if the draft introduces a
  perspective a related page is *missing*, add a **brief mention + pointer** to that page and keep
  the detail in the new (specialized) page; if the draft *repeats* what a page already covers in
  depth, trim the draft and reference that page. Aim for one authoritative treatment per idea with
  lightweight, mutually-aware links.
- Capture new figures/keywords in `index-terms.mjs`, `npm run reindex`, and log a `/changes` entry
  if substantial. Before editing **existing** published essays, show the edits and get confirmation.

## Commands

```bash
npm install
npm run reindex   # regenerate embeddings + related links (after editing essays)
npm run dev       # dev server (uses the last-built index; does NOT reindex)
npm run build     # reindex + static build into dist/
```

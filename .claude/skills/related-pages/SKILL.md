---
name: related-pages
description: Cross-check a draft essay against the existing collection and reconcile it with its related pages — find semantic neighbors, then review them together for contradictions, redundancy vs missing perspectives, cross-linking, and policy/style fit. Use ONLY when the user explicitly asks to cross-check, review, or update related pages for a draft; it is a deliberate, lengthy, model-loading pass, so never run it automatically when simply adding or editing an essay.
---

# Cross-checking & reconciling related pages

Run this **only when the user explicitly asks** to "cross-check", "review related pages", or
"update related pages" for a draft. It loads the embedding model and reads several essays, so it
is slow and costly — do not trigger it as part of ordinary essay edits.

First read `src/pages/policy.md` and `src/pages/style.md` (the editorial policy and writing style)
so every judgement below is grounded in them.

## 1. Find the neighbors

Run the helper (it embeds the draft with the same model the site uses and ranks existing
articles by semantic similarity, listing the curated index-terms the draft shares with each):

```bash
npm run related -- <path-to-draft.md> [topN]
```

Read the top matches in full. Treat the "shared terms" as cross-linking candidates (same
figures/movements) and the similarity % as the thematic-overlap signal. If the draft isn't a file
yet, save it into `src/content/articles/` first (it need not be indexed — the helper compares the
draft against the already-built `public/search-index.json`).

## 2. Review the draft and neighbors together

For each close page, look for:

- **Contradictions** — a claim, date, attribution, or emphasis in the draft that conflicts with an
  existing page. Resolve to the accurate version; fix whichever page is wrong.
- **Terminology / naming drift** — the same figure or movement named or framed inconsistently.
- **Redundancy vs missing perspective** — see the rule below; this is the heart of the pass.
- **Cross-linking** — new figures/keywords that belong in `src/data/index-terms.mjs` so the
  auto-linker and index pages connect the draft to the rest.
- **Policy / style fit** — neutrality and breadth; plain, non-jargon voice; sparing bold/italics;
  single dash「—」; Japanese endings ました/でした/です (never 〜のです); footnote handling.

## 3. Redundancy vs missing perspective (hub-and-spoke)

Do **not** treat overlap only as something to delete. Two moves, depending on direction:

- **Draft repeats what a page already covers in depth** → trim the draft and point to that page,
  so the detailed treatment lives in one place.
- **Draft introduces a perspective the related page is missing** (e.g. a new lens on a decade) →
  add a **brief** mention to that related page and **delegate the detail to the new page**. The
  specialized essay is the hub that holds the depth; the decade/overview pages carry a short
  mention plus a pointer, so the perspective isn't absent there but also isn't duplicated.

The goal is one authoritative treatment per idea, with lightweight, mutually-aware links around it —
not isolated pages that silently disagree or repeat each other.

## 4. Apply and finish

- Edit the **draft** freely. Before editing **existing published essays**, show the specific
  proposed edits and get the user's confirmation — don't silently rewrite good neighbors.
- Add any new figures/keywords to `src/data/index-terms.mjs` (label, optional query, aliases with
  surnames + Japanese forms).
- Run `npm run reindex`.
- If the change is substantial (new essay, real new coverage — not typos/wording), prepend a dated
  bilingual entry to `src/pages/changes.md`.
- Verify in the browser (the draft renders bilingually; new cross-links resolve).

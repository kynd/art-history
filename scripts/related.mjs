// Related-pages helper (run on request only — it loads the embedding model).
//
// Given a draft essay, this reproduces the site's own notion of "related" and reports
// the existing articles most worth reviewing alongside it. For each candidate it shows:
//   • semantic similarity  — cosine of the draft's (title + summary) embedding against the
//     precomputed article vectors in public/search-index.json (same model the site uses)
//   • shared index-terms   — curated figures/keywords (from src/data/index-terms.mjs) that
//     appear in BOTH the draft and that article's full text (surfaces pages sharing the
//     same people/movements, i.e. good cross-linking / hub-and-spoke candidates)
//
// Usage:  npm run related -- <path-to-draft.md> [topN]

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { pipeline } from '@xenova/transformers';
import { CHRONOLOGY, ARTISTS, KEYWORDS } from '../src/data/index-terms.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODEL = 'Xenova/all-MiniLM-L6-v2';

const draftPath = process.argv[2];
const topN = Number(process.argv[3]) || 8;
if (!draftPath) {
  console.error('Usage: npm run related -- <path-to-draft.md> [topN]');
  process.exit(1);
}

function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const [, fm, body] = m;
  const data = {};
  const t = fm.match(/^title:\s*(.*)$/m);
  if (t) data.title = t[1].trim().replace(/^["']|["']$/g, '');
  return { data, body };
}
function firstParagraph(body) {
  for (const b of body.trim().split(/\n\s*\n/)) {
    const s = b.trim();
    if (!s || s.startsWith('#') || s.startsWith('<!--') || s.startsWith('<')) continue;
    return s.replace(/\s+/g, ' ').replace(/[*_`]/g, '').trim();
  }
  return '';
}
function plain(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const raw = await readFile(draftPath, 'utf8');
const { data, body } = parse(raw);
const title = data.title || basename(draftPath, '.md');
const summary = firstParagraph(body);
const draftSlug = basename(draftPath, '.md');
const draftText = plain(`${title} ${body}`);

// Term presence with the same partial-word guards as the site auto-linker, so the
// "shared terms" are trustworthy (no OMA→"oma", no リベラ inside リベラル, no 具体 in 具体的).
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isKata = (c) => c !== undefined && c >= '゠' && c <= 'ヿ';
function makeTest(alias) {
  const a = alias.toLowerCase();
  if (/[a-z]/.test(a)) {
    const re = new RegExp('(?<![a-z])' + escapeRe(a) + '(?![a-z])');
    return (text) => re.test(text);
  }
  return (text) => {
    let i = text.indexOf(a);
    while (i !== -1) {
      const after = text[i + a.length];
      const badSuffix = after && '的化性家派'.includes(after);
      const partialKatakana = isKata(a[0]) && isKata(after);
      if (!badSuffix && !partialKatakana) return true;
      i = text.indexOf(a, i + 1);
    }
    return false;
  };
}
const TERMS = [...CHRONOLOGY, ...ARTISTS, ...KEYWORDS].map((t) => ({
  label: t.label,
  tests: [t.label, ...(t.aliases || [])].map(makeTest),
}));
const draftTerms = TERMS.filter((t) => t.tests.some((fn) => fn(draftText)));

console.log(`\n[related] draft: "${title}"`);
console.log(`[related] loading model ${MODEL} …\n`);
const embed = await pipeline('feature-extraction', MODEL);
const out = await embed(`${title}. ${summary}`, { pooling: 'mean', normalize: true });
const draftVec = Array.from(out.data);

const articles = JSON.parse(await readFile(join(ROOT, 'public/search-index.json'), 'utf8'));
const ranked = articles
  .filter((a) => a.slug !== draftSlug)
  .map((a) => {
    const shared = draftTerms.filter((t) => t.tests.some((fn) => fn(a.text || ''))).map((t) => t.label);
    return { slug: a.slug, title: a.title, sim: cosine(draftVec, a.vector), shared };
  })
  .sort((x, y) => y.sim - x.sim)
  .slice(0, topN);

console.log(`Top ${ranked.length} pages to review alongside the draft:\n`);
for (const r of ranked) {
  console.log(`  ${(r.sim * 100).toFixed(0)}%  ${r.slug}`);
  console.log(`        ${r.title}`);
  if (r.shared.length) console.log(`        shared terms: ${r.shared.join(', ')}`);
  console.log('');
}
console.log(`Draft mentions ${draftTerms.length} curated index-term(s): ${draftTerms.map((t) => t.label).join(', ') || '(none)'}\n`);

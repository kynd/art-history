// Build-time search index generator.
//
// Reads every article in src/content/articles, extracts the title, the first
// paragraph (= summary), and topics, then computes a sentence embedding for each
// using the SAME model the browser uses (Xenova/all-MiniLM-L6-v2). Writes:
//   public/search-index.json  — [{ slug, title, summary, topics, vector }]
//   public/related.json       — { slug: [{ slug, title, summary, score }] }
//   public/topics.json        — [{ label, query, vector }]
//
// Ranking at runtime is plain cosine similarity over these vectors — no server.

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pipeline } from '@xenova/transformers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(ROOT, 'src/content/articles');
const PUBLIC_DIR = join(ROOT, 'public');
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const RELATED_COUNT = 4;

// ── Minimal frontmatter + summary parsing ─────────────────────────────────
function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const [, fm, body] = m;
  const data = {};
  for (const line of fm.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val.startsWith('[')) {
      // simple inline array: ["a", "b"]
      data[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      data[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return { data, body };
}

const cleanBlock = (t) => t.replace(/\s+/g, ' ').replace(/[*_`]/g, '').trim();
const isProse = (t) => t && !t.startsWith('#') && !t.startsWith('<!--') && !t.startsWith('<') && t !== '---';

// Summaries: the first English prose block, and the Japanese block that follows it
// (after the `<!-- -->` separator). Used for the search snippet and result lists.
function summaries(body) {
  const blocks = body.trim().split(/\n\s*\n/).map((b) => b.trim());
  let i = blocks.findIndex(isProse);
  if (i === -1) return { en: '', ja: '' };
  const en = cleanBlock(blocks[i]);
  let ja = '';
  for (let j = i + 1; j < blocks.length; j++) {
    if (blocks[j].startsWith('<!--')) continue; // skip the EN/JA separator
    if (isProse(blocks[j])) ja = cleanBlock(blocks[j]);
    break; // stop at the first block after the separator (JA, or a section break)
  }
  return { en, ja };
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function main() {
  console.log('[build-index] loading model %s …', MODEL);
  const embed = await pipeline('feature-extraction', MODEL);
  const vec = async (text) => {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  };

  const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'));
  const articles = [];
  for (const file of files) {
    const raw = await readFile(join(ARTICLES_DIR, file), 'utf8');
    const { data, body } = parse(raw);
    const slug = file.replace(/\.md$/, '');
    const { en: summary, ja: summaryJa } = summaries(body);
    const title = data.title || slug;
    const topics = data.topics || [];
    console.log('[build-index] embedding %s', slug);
    const vector = (await vec(`${title}. ${summary}`)).map((x) => +x.toFixed(5));
    // Full plaintext (EN + JA), lowercased — powers the lexical half of hybrid search
    // so a person/keyword named anywhere in the body is always findable.
    const text = `${title} ${body}`
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`>#|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    // Editorial dates for display + homepage sort. `mtime` is a fine-grained tiebreak
    // so pages edited on the same calendar day still order newest-first.
    const created = data.created || null;
    const updated = data.updated || created || null;
    const mtime = (await stat(join(ARTICLES_DIR, file))).mtimeMs;
    articles.push({ slug, title, summary, summaryJa, topics, vector, text, created, updated, mtime });
  }

  // Precompute top-N related per article (cosine over article vectors).
  const related = {};
  for (const a of articles) {
    related[a.slug] = articles
      .filter((b) => b.slug !== a.slug)
      .map((b) => ({ slug: b.slug, title: b.title, summary: b.summary, score: cosine(a.vector, b.vector) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, RELATED_COUNT);
  }

  // Preset topic chips → embed their query text.
  const { TOPICS } = await import('../src/data/topics.mjs');
  const topics = [];
  for (const t of TOPICS) {
    topics.push({ label: t.label, query: t.query, vector: await vec(t.query) });
  }

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(articles));
  await writeFile(join(PUBLIC_DIR, 'related.json'), JSON.stringify(related));
  await writeFile(join(PUBLIC_DIR, 'topics.json'), JSON.stringify(topics));
  console.log('[build-index] wrote %d articles, %d topics', articles.length, topics.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

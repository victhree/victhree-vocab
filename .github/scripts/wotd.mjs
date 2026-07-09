/* Vocabulary of the Day generator — runs in GitHub Actions (Node 20+).
   Fetches Indian newspaper RSS, asks Google Gemini (free tier) for 10
   exam-relevant vocab words, writes docs/data/wotd.json
   (newest day first, last 30 days kept).
   Requires repo secret GEMINI_API_KEY (free from https://aistudio.google.com/apikey). */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const API_KEY = process.env.GEMINI_API_KEY;
// Tried in order; first one that works wins. Guards against Google renaming models.
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
const OUT = 'docs/data/wotd.json';
const KEEP_DAYS = 30;

// Newspaper RSS feeds. If one is down or blocked, it's skipped.
const FEEDS = [
  { source: 'The Hindu',        url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { source: 'The Hindu',        url: 'https://www.thehindu.com/news/international/feeder/default.rss' },
  { source: 'Times of India',   url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
  { source: 'Indian Express',   url: 'https://indianexpress.com/feed/' },
  { source: 'Hindustan Times',  url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
];

function istDate() {
  // IST = UTC+5:30
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const iso = now.toISOString().slice(0, 10);
  const label = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { iso, label };
}

function strip(s) {
  return (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&#8216;/g, "'").replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

async function fetchFeed(feed) {
  try {
    const r = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (VicThree WOTD bot)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) { console.log(`skip ${feed.url} (HTTP ${r.status})`); return []; }
    const xml = await r.text();
    const items = [];
    const blocks = xml.split(/<item[\s>]/i).slice(1);
    for (const b of blocks.slice(0, 25)) {
      const title = strip((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
      const desc = strip((b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1]);
      if (title && title.length > 8) items.push({ source: feed.source, headline: title.slice(0, 160), context: desc.slice(0, 220) });
    }
    console.log(`ok ${feed.url} -> ${items.length} items`);
    return items;
  } catch (e) { console.log(`skip ${feed.url} (${e.message})`); return []; }
}

function extractJSON(s) {
  try { return JSON.parse(s); } catch {}                 // schema mode returns pure JSON
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON found in model output');
  const slice = s.slice(a, b + 1);
  try { return JSON.parse(slice); } catch {}
  // last resort: strip trailing commas before } or ]
  return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1'));
}

async function askGemini(headlines) {
  const prompt =
`You are building "Vocabulary of the Day" for serious Indian defence-exam aspirants (UPSC CDS & AFCAT).

Below are today's news items from Indian newspapers. Each line is tagged [SOURCE] and has a one-line HEADLINE plus some CONTEXT.

Pick EXACTLY 10 English vocabulary words that ACTUALLY APPEAR in these headlines/context and are worth learning for CDS/AFCAT. Aim HIGH on difficulty:
- Choose harder, exam-level words — the kind that appear in CDS synonym/antonym and cloze questions (e.g. words like "reticent", "exacerbate", "capitulate", "ostensible", "belligerent", "assuage", "precarious", "vociferous").
- STRICTLY AVOID easy/common words (e.g. "strategic", "prospects", "yield", "intervention", "accord", "confer", "proactive", "stalled", "produce", "meeting"). If a word would be understood by a class-8 student, do NOT pick it.
- No proper nouns, place names, or names of people/organisations. No obscure technical jargon. No duplicates.
- Prefer variety of parts of speech.

For each word return:
- "word": the base/dictionary form (lemma), in Title Case (e.g. "Reticent")
- "pos": part of speech (noun, verb, adjective, adverb)
- "meaning": one concise definition
- "synonyms": array of 2-3 synonyms
- "example": one short example sentence (you may adapt the news sentence)
- "source": the newspaper name only (from the [SOURCE] tag)
- "headline": the single HEADLINE line the word (or its topic) came from — ONE short line only, verbatim from HEADLINE. Do NOT include the CONTEXT text, and never return more than one sentence.

Return ONLY a JSON object of the form {"words":[ ... 10 objects ... ]}. No markdown, no commentary.

NEWS:
${headlines}`;

  // A strict response schema forces Gemini to emit well-formed, correctly-typed JSON
  // (fixes intermittent "SyntaxError ... in JSON" from free-form JSON mode).
  const wordSchema = {
    type: 'object',
    properties: {
      word: { type: 'string' },
      pos: { type: 'string' },
      meaning: { type: 'string' },
      synonyms: { type: 'array', items: { type: 'string' } },
      example: { type: 'string' },
      source: { type: 'string' },
      headline: { type: 'string' },
    },
    required: ['word', 'pos', 'meaning', 'synonyms', 'example', 'source', 'headline'],
  };
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: { words: { type: 'array', items: wordSchema } },
        required: ['words'],
      },
    },
  });

  let lastErr = '';
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': API_KEY },
        body,
        signal: AbortSignal.timeout(180000),
      });
      if (!r.ok) {
        lastErr = `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
        console.log(`model ${model} failed -> ${lastErr}`);
        if (r.status === 401 || r.status === 403) break;   // bad key: no point trying others
        continue;
      }
      const data = await r.json();
      const cand = (data.candidates || [])[0];
      if (!cand) { lastErr = `no candidate: ${JSON.stringify(data).slice(0, 200)}`; console.log(`model ${model} -> ${lastErr}`); continue; }
      const fr = cand.finishReason;
      if (fr && fr !== 'STOP' && fr !== 'MAX_TOKENS') { lastErr = `finishReason ${fr}`; console.log(`model ${model} -> ${lastErr}`); continue; }
      const text = (cand.content?.parts || []).map(p => p.text || '').join('');
      let parsed;
      try { parsed = extractJSON(text); }
      catch (e) { lastErr = `parse fail (${e.message}); raw: ${text.slice(0, 200)}`; console.log(`model ${model} -> ${lastErr}`); continue; }
      const words = (Array.isArray(parsed.words) ? parsed.words : [])
        .filter(w => w && w.word && w.meaning).slice(0, 10).map(oneLineHeadline);
      if (words.length < 5) { lastErr = `only ${words.length} words`; console.log(`model ${model} -> ${lastErr}`); continue; }
      console.log(`ok model ${model} -> ${words.length} words`);
      return words;
    } catch (e) { lastErr = e.message; console.log(`model ${model} error -> ${lastErr}`); }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastErr}`);
}

// Defensive: keep only the first single line/sentence of the headline, capped.
function oneLineHeadline(w) {
  let h = String(w.headline || '').replace(/\s+/g, ' ').trim();
  h = h.split(/\s*\|\|\s*/)[0];                 // drop any "|| CONTEXT" that leaked through
  h = h.replace(/\s+CONTEXT:.*$/i, '').trim();
  if (h.length > 130) {                          // cut long dumps at a sentence/word boundary
    const dot = h.slice(0, 130).lastIndexOf('. ');
    h = dot > 40 ? h.slice(0, dot) : h.slice(0, 127).replace(/\s+\S*$/, '') + '…';
  }
  return { ...w, headline: h };
}

async function main() {
  if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  if (all.length < 8) { console.error('Too few news items fetched; aborting (keeping existing data).'); process.exit(0); }

  // dedupe headlines, cap the blob
  const seen = new Set();
  const picked = [];
  for (const it of all) { const k = it.headline.toLowerCase(); if (!seen.has(k)) { seen.add(k); picked.push(it); } }
  const blob = picked.slice(0, 60)
    .map(it => `[${it.source}] HEADLINE: ${it.headline}` + (it.context ? ` || CONTEXT: ${it.context}` : ''))
    .join('\n');

  const words = await askGemini(blob);
  if (words.length < 5) { console.error(`Only ${words.length} words returned; aborting (keeping existing data).`); process.exit(0); }

  const { iso, label } = istDate();
  const todayBatch = { date: iso, label, words };

  let archive = [];
  if (existsSync(OUT)) { try { archive = JSON.parse(readFileSync(OUT, 'utf8')); } catch {} }
  if (!Array.isArray(archive)) archive = [];
  archive = archive.filter(b => b && b.date !== iso);          // replace today if re-run
  archive.unshift(todayBatch);                                  // newest first
  archive = archive.slice(0, KEEP_DAYS);

  writeFileSync(OUT, JSON.stringify(archive, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${words.length} words for ${iso}. Archive now ${archive.length} day(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });

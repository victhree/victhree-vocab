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
      const text = (title + '. ' + desc).trim();
      if (title && title.length > 8) items.push({ source: feed.source, headline: title, text: text.slice(0, 300) });
    }
    console.log(`ok ${feed.url} -> ${items.length} items`);
    return items;
  } catch (e) { console.log(`skip ${feed.url} (${e.message})`); return []; }
}

function extractJSON(s) {
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON found in model output');
  return JSON.parse(s.slice(a, b + 1));
}

async function askGemini(headlines) {
  const prompt =
`You are building "Vocabulary of the Day" for Indian defence-exam aspirants (UPSC CDS & AFCAT).

Below are today's news headlines and summaries from Indian newspapers, each tagged [SOURCE].

Pick EXACTLY 10 genuinely useful English vocabulary words that ACTUALLY APPEAR in these headlines/summaries and are the kind CDS/AFCAT test: moderately advanced (not trivial words like "government" or "said"; not obscure technical jargon or names). Prefer words a serious aspirant should learn.

For each word return:
- "word": the base/dictionary form (lemma), capitalised
- "pos": part of speech (e.g. noun, verb, adjective, adverb)
- "meaning": one concise definition
- "synonyms": array of 2-3 common synonyms
- "example": one short example sentence (you may adapt the news sentence)
- "source": the newspaper it appeared in (from the [SOURCE] tag)
- "headline": the exact headline the word appeared in

Avoid proper nouns, place names, and names of people/organisations. No duplicates.

Return ONLY a JSON object of the form {"words":[ ... 10 objects ... ]}. No markdown, no commentary.

NEWS:
${headlines}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
    },
  });

  let data = null, lastErr = '';
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': API_KEY },
        body,
        signal: AbortSignal.timeout(180000),
      });
      if (r.ok) { data = await r.json(); console.log(`ok model ${model}`); break; }
      lastErr = `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
      console.log(`model ${model} failed -> ${lastErr}`);
      if (r.status === 401 || r.status === 403) break;   // bad/again-unauthorized key: no point trying others
    } catch (e) { lastErr = e.message; console.log(`model ${model} error -> ${lastErr}`); }
  }
  if (!data) throw new Error(`All Gemini models failed. Last error: ${lastErr}`);

  const cand = (data.candidates || [])[0];
  if (!cand) throw new Error(`no candidate returned: ${JSON.stringify(data).slice(0, 400)}`);
  if (cand.finishReason && cand.finishReason !== 'STOP' && cand.finishReason !== 'MAX_TOKENS') {
    throw new Error(`generation stopped: ${cand.finishReason}`);
  }
  const text = (cand.content?.parts || []).map(p => p.text || '').join('');
  const parsed = extractJSON(text);
  const words = Array.isArray(parsed.words) ? parsed.words : [];
  return words.filter(w => w && w.word && w.meaning).slice(0, 10);
}

async function main() {
  if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  if (all.length < 8) { console.error('Too few news items fetched; aborting (keeping existing data).'); process.exit(0); }

  // dedupe headlines, cap the blob
  const seen = new Set();
  const picked = [];
  for (const it of all) { const k = it.headline.toLowerCase(); if (!seen.has(k)) { seen.add(k); picked.push(it); } }
  const blob = picked.slice(0, 60).map(it => `[${it.source}] ${it.text}`).join('\n');

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

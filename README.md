# VicThree Vocab — CDS & AFCAT English Vocabulary

A static, mobile-first vocabulary practice site for **CDS & AFCAT** English, by VicThree Defence.
Sibling project to [victhree-pyq](https://github.com/victhree/victhree-pyq); same navy/gold look, served from `/docs` on GitHub Pages.

**Live:** https://victhree.github.io/victhree-vocab/

## What it does
- **Quiz** — 737 CDS-style multiple-choice questions (Part A synonyms/antonyms · Part B idioms · Part C one-word substitutions). Tap an option → instant green/red feedback, and the word's **full detail card opens** (meaning, example, synonyms, antonyms, rule to remember / memory hook). Running score bar; pick 20/50/100/all and reshuffle.
- **Word Bank** — browse all 737 detail cards; filter by type (words / idioms / one-word subs) and level; full-text search; **★ Bookmark** words and a "★ bookmarked only" filter.
- **Remember what you've seen** — bookmarks + per-word ✓ got it / ✗ missed progress (auto-recorded from quiz answers), stored in `localStorage`.
- **Download card → PNG** — every detail card has a "⬇ Download card" button that renders a shareable image entirely in the browser (no server, works offline). Dependency-free Canvas renderer.
- **PWA** — installable, works offline after first visit.

## Data
Two JSON files in `docs/data/`, generated from the two source DOCX:
- `words.json` — 737 detail records. Three kinds:
  - `word` (596): `word, meaning, example, trick, syn[], ant[], level, tier`
  - `ows` (92, one-word substitution): `desc, word, trick, level`
  - `idiom` (49): `word(=phrase), meaning, example, level`
- `questions.json` — 737 quiz questions: `id, part(A/B/C), type, stem, options[4], answer(index), wordId`. Every `wordId` resolves to a record in `words.json` (100% join coverage).

Source documents are archived in `sources/` so the data can be rebuilt:
- `CDS_AFCAT_English_Vocabulary.docx` → details
- `CDS_AFCAT_Vocabulary_Quiz.docx` → quiz

The generator parsing logic lives in the build notes; join keys are: Part A = capitalised stem word → `word`; Part B = quoted idiom → idiom; Part C = answer word → one-word substitution.

## Project layout
```
docs/
  index.html        home hub + stats
  quiz.html         interactive quiz
  browse.html       word bank
  css/styles.css
  js/data.js        data load, localStorage, PNG renderer, SW reg
  js/home.js  quiz.js  browse.js
  data/words.json  questions.json
  assets/           PWA icons (navy/gold V3)
  manifest.webmanifest  sw.js  .nojekyll
sources/            archived source text
```

## Deploy (GitHub Pages)
Pages is served from `main` branch, `/docs` folder.
```
git add -A
git commit -m "..."
git push        # supply a PAT when prompted
```
Bump the `?v=N` query on CSS/JS in all HTML pages **and** the `CACHE` const + `SHELL` list in `sw.js` in lockstep on any CSS/JS change (GitHub Pages caches assets for 10 min).

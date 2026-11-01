# Arabii

A self-study Arabic course for Ahmed, hosted on GitHub Pages. Static site: no build step, no framework, no dependencies.

## Layout
- `index.html` — shell page
- `assets/app.js` — everything: hash router, lesson renderer, quiz, spaced-repetition review
- `assets/style.css` — styles (light + dark via `prefers-color-scheme`)
- `content/tracks.json` — the course index: tracks and their ordered lessons
- `content/lessons/<id>.json` — one file per lesson
- `scripts/check_content.py` — validates content; runs in CI before every deploy
- `.github/workflows/pages.yml` — deploys to GitHub Pages on every push to `main`

## Tracks
`foundations` (alphabet, harakat, reading) → `quranic`, `msa`, `dialect` (Egyptian for now; the dialect choice can change).

## Adding a lesson
1. Create `content/lessons/<id>.json` (ids: `f#-`, `q#-`, `m#-`, `d#-` prefix + short slug).
2. Add `{ "id", "title", "summary" }` to the right track in `content/tracks.json`.
3. Run `python3 scripts/check_content.py`.

Lesson fields: `id`, `title`, `summary`, `sections[]`, `vocab[]` (`ar`, `tr`, `en`), and optional `quranic: true` (Amiri Quran font), `quizMode: "ar-en" | "en-ar"` (default mixed), `hideVocab: true`.
Section types: `text` / `note` (trusted HTML in `body`; use single quotes for attributes inside JSON), `heading` (`text`), `letters` (`items`: ar/name/sound), `table` (`headers`, `rows`, `arCols`), `ayat` (`items`: n/ar/en).

## Rules
- **Don't reorder or remove existing `vocab` items.** Flashcards are keyed `lessonId:index` in localStorage; append new words at the end.
- Arabic content: include full harakat for Foundations, Quranic, and MSA lessons; dialect lessons are written without them.
- Quranic text must be copied exactly (Uthmani-style with harakat). Translations are meaning aids, not tafsir.
- Keep it dependency-free unless there's a clear reason.

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000 (fetch() needs a server; opening the file directly won't load content).

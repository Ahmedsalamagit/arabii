# Arabii — مدخل إلى الفصحى

Ahmed's Fuṣḥā (Modern Standard Arabic) course, originally built as a Claude artifact.

**Live site:** https://ahmedsalamagit.github.io/arabii/

## What's here
- `index.html` — the whole course in one self-contained page (bundled React app): lessons, drills, flashcards. Progress is saved in the browser's localStorage.
- `.github/workflows/pages.yml` — deploys to GitHub Pages on every push to `main`.

## AI features
A few extras (glosses for words outside the built-in glossary, generated drills, writing feedback) call Claude. Inside claude.ai they use the artifact runtime; elsewhere the page checks for a `/api/claude` endpoint and quietly disables those features if it isn't there. On GitHub Pages they're off; everything else works.

## Run locally
`python3 -m http.server 8000`, then open http://localhost:8000

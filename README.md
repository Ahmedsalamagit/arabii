# Arabii — عربي

A self-study Arabic course: the alphabet and reading, Quranic Arabic, Modern Standard Arabic, and spoken Egyptian Arabic.

**Live site:** https://ahmedsalamagit.github.io/arabii/

## Features
- Four tracks with lessons, vocabulary, and listen buttons (uses your device's Arabic voice)
- Auto-generated quizzes; scoring 80%+ completes a lesson
- Spaced-repetition flashcards: every lesson you open adds its words to your review deck
- Progress saved in your browser; works on phone and desktop, light and dark mode

## Development
No build step. Run `python3 -m http.server 8000` and open http://localhost:8000.
Every push to `main` is checked by `scripts/check_content.py` and deployed by GitHub Actions.
See `CLAUDE.md` for how lessons are structured and how to add one.

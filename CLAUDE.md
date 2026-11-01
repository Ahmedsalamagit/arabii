# Arabii

Ahmed's Fuṣḥā (MSA) course, hosted on GitHub Pages at https://ahmedsalamagit.github.io/arabii/

## Source of truth
The course was built as a claude.ai artifact: https://claude.ai/artifact/PHeSquPcNV6Pc7hyQ1Y5Cr
`index.html` is that artifact's page, extracted from claude.ai's wrapper. It is a **compiled bundle** (React inlined, minified) — there is no separate source in this repo.

- To change the course: edit the artifact, then re-export it here (read the artifact, take the inner `<!doctype html>…</html>` document, replace `index.html`). Don't hand-edit the minified bundle except for tiny fixes.
- Progress lives in localStorage under `fusha-v2` (and `fusha-gloss` for cached glosses). Don't rename these keys or Ahmed loses his progress.

## AI features
The page calls Claude via `window.claude.use("sample")` inside claude.ai. Elsewhere it probes `GET /api/claude/health` and `POST /api/claude` (`{prompt, tier}` → `{text}`); if absent, AI extras disable themselves. Hosting on Azure Static Web Apps with an `/api/claude` Function holding an Anthropic API key would re-enable them.

## Deploy
Every push to `main` deploys via `.github/workflows/pages.yml`.

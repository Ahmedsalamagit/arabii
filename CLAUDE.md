# Arabii — Arabic from A to Z

Ahmed's structured Fuṣḥā course, hosted on GitHub Pages at https://ahmedsalamagit.github.io/arabii/
Static site: no build step, no framework, no dependencies.

## The one rule
**Teach before you test.** Every Arabic word in a lesson's `read`, `practice` or `check` must already appear in the `words` or `understand` of that lesson or an earlier one. `scripts/check_content.py` enforces this and blocks deploys that break it. Never weaken the checker to make content pass; fix the content (teach the word earlier, or drop it).

## Curriculum (order is deliberate)
- **Stage 0 · Reading** (`r*`): order of al-Qāʿida an-Nūrāniyya: letters → joining → short vowels → sukūn/shadda → long vowels → tanwīn/ة → al- (sun/moon, hamzat al-waṣl). Exempt from the vocabulary check.
- **Stage 1 · Nominal sentence** (`n01`–`n12`): order of Madinah Book 1: هذا/ما → مَن/أ → ذلك/و → al- + mubtadaʾ/khabar → أين/في/على (jarr) → iḍāfa → pronouns → feminine هذه/تلك → naʿt → يا + family → past tense → three cases + mabnī.
- **Roadmap** (in `course.json`): Stage 2 Madinah Book 2 (present tense, dual/plurals, إنّ/كان, numbers…), Stage 3 Ājurrūmiyya, Stage 4 real texts (Qaṣaṣ an-Nabiyyīn, Nawawī, Juzʾ ʿAmma).
- All text is original. Follow the books' *sequence*; never copy their text.

## Layout
- `index.html`, `assets/app.js` (router, lesson stepper, exercises, spaced review), `assets/style.css`
- `content/course.json`: stages, lesson order, roadmap, Method page text + sources
- `content/lessons/<id>.json`: one lesson
- `scripts/check_content.py`: structure + teach-before-test; runs in CI before deploy
- `.github/workflows/pages.yml`: deploy on push to `main`

## Lesson format
`{ id, title, ar, goal, learnIntro?, words[], understand[], read?, practice[], check[], noAutoVocab? }`
- `words[]`: `{ar, tr, en, note?, noQuiz?, noCard?}`. **Append only; never reorder or delete** (review cards are keyed `lessonId:index`).
- `understand[]` blocks: `{p}` `{h}` `{rule}` `{tip}` (HTML; Arabic in `<span class='ar'>`, cases in `ar raf|nasb|jarr`), `{examples:[{ar,en}]}`, `{table:{headers,rows,ar:[colIdx]}}`, `{letters:[{ar,name,sound}]}`. Inductive order: examples first, then the rule.
- `read`: `{intro?, lines:[{who?, ar, en}]}`.
- Exercises: `{t:"mcq", q, ar?, opts, a, why?}`, `{t:"build", en, words:[in reading order], extra?, why?}`, `{t:"match", pairs:[[ar,en]…]}`. The check also gets up to 5 auto-generated vocab questions from `words`.
- Arabic is fully voweled everywhere, including case endings.

## Adding a Stage 2 lesson
Add it to a new stage in `course.json` (move items out of `roadmap`), write `content/lessons/<id>.json`, run `python3 scripts/check_content.py`, then serve locally and click through.

## Run locally
`python3 -m http.server 8000` → http://localhost:8000. Progress is in localStorage key `arabii-v2`.

## History
The previous Fuṣḥā course (a claude.ai artifact, https://claude.ai/artifact/PHeSquPcNV6Pc7hyQ1Y5Cr) was replaced by this one; it remains in git history (commit fcaedaf) and in claude.ai.

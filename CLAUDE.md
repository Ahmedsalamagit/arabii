# Arabii — Arabic from A to Z

Ahmed's structured Fuṣḥā course, hosted on GitHub Pages at https://ahmedsalamagit.github.io/arabii/
Static site: no build step, no framework, no dependencies.

## The one rule
**Teach before you test.** Every Arabic word in a lesson's `read`, `practice` or `check` must already appear in the `words` or `understand` of that lesson or an earlier one. `scripts/check_content.py` enforces this and blocks deploys that break it. Never weaken the checker to make content pass; fix the content (teach the word earlier, or drop it).

## Curriculum (order is deliberate)
- **Stage 0 · Reading** (`r*`): order of al-Qāʿida an-Nūrāniyya: letters → joining → short vowels → sukūn/shadda → long vowels → tanwīn/ة → al- (sun/moon, hamzat al-waṣl). Exempt from the vocabulary check.
- **Stage 1 · Nominal sentence** (`n01`–`n12`): order of Madinah Book 1: هذا/ما → مَن/أ → ذلك/و → al- + mubtadaʾ/khabar → أين/في/على (jarr) → iḍāfa → pronouns → feminine هذه/تلك → naʿt → يا + family → past tense → three cases + mabnī.
- **Stage 1, part 2** (`n13`–`n21`, stage id `book1b`): the rest of Madinah Book 1 (its lessons 10–23), checked against the book: attached pronouns + عِنْدِي/لِي → هذا + الْ, الذي/التي, لِـ, أمام/خلف/تحت → greetings → plurals of people (هؤلاء/أولئك, هم/هنّ, sound + broken, ذهبوا/ذهبن) → نحن/أنتم/أنتنّ, ـنا/ـكم, قبل/بعد → plurals of things = feminine singular → dual + كم → numbers 3–10 → mamnūʿ min aṣ-ṣarf + colours.
- **Roadmap** (in `course.json`): Stage 2 Madinah Book 2 (present tense, dual/plurals, إنّ/كان, numbers…), Stage 3 Ājurrūmiyya, Stage 4 real texts (Qaṣaṣ an-Nabiyyīn, Nawawī, Juzʾ ʿAmma).
- All text is original. Follow the books' *sequence*; never copy their text.

## Layout
- `index.html`, `assets/app.js` (router, lesson stepper, exercises, spaced review), `assets/style.css`
- `content/course.json`: stages, lesson order, roadmap, Method page text + sources
- `content/lessons/<id>.json`: one lesson
- `content/quran-words.json`: the Qur'an tab, topic word lists transcribed from “80% of Qur'anic Words” (part 1). Its own spaced-review deck, cards keyed `quran:<listId>:<index>`, so `words` are **append-only** here too. Lists/words `{ar, tr, en, note?, n?}` (`n` = occurrences in the Qur'an).
- `scripts/check_content.py`: structure + teach-before-test; runs in CI before deploy
- `.github/workflows/pages.yml`: deploy on push to `main`

## Lesson format
`{ id, title, ar, goal, learnIntro?, words[], understand[], read?, practice[], check[], noAutoVocab? }`
- `words[]`: `{ar, tr, en, note?, noQuiz?, noCard?}`. **Append only; never reorder or delete** (review cards are keyed `lessonId:index`).
- `understand[]` blocks: `{p}` `{h}` `{rule}` `{tip}` (HTML; Arabic in `<span class='ar'>`, cases in `ar raf|nasb|jarr`), `{examples:[{ar,en}]}`, `{table:{headers,rows,ar:[colIdx]}}`, `{letters:[{ar,name,sound}]}`. Inductive order: examples first, then the rule.
- `read`: `{intro?, lines:[{who?, ar, en}]}`.
- Exercises: `{t:"mcq", q, ar?, opts, a, why?}`, `{t:"build", en, words:[in reading order], extra?, why?}`, `{t:"match", pairs:[[ar,en]…]}`. The check also gets up to 5 auto-generated vocab questions from `words`.
- Arabic is fully voweled everywhere, including case endings.

## Arabic in the course itself (phrases)
`course.json` → `phrases`: `{key: {en, ar, from}}`. Course text (questions, feedback, headers) switches from `en` to `ar` from lesson `from` onward, with an EN button to peek. The checker fails if a phrase uses a word not taught by the end of `from`. To Arabize more of the UI: teach the missing word in a lesson (append to `words`, plus a `{tip}` in `understand` announcing the switch), add the phrase, wire it in `app.js` (`qHTML` / `label`). An exercise whose `q` equals a phrase's `en` switches automatically. As the course grows, prefer writing new lessons' prompts and explanations with words already taught.

## Adding a Stage 2 lesson
Add it to a new stage in `course.json` (move items out of `roadmap`), write `content/lessons/<id>.json`, run `python3 scripts/check_content.py`, then serve locally and click through.

## Run locally
`python3 -m http.server 8000` → http://localhost:8000. Progress is in localStorage key `arabii-v2`.

## History
The previous Fuṣḥā course (a claude.ai artifact, https://claude.ai/artifact/PHeSquPcNV6Pc7hyQ1Y5Cr) was replaced by this one; it remains in git history (commit fcaedaf) and in claude.ai.

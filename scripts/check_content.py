#!/usr/bin/env python3
"""Validate the course before it deploys. Fails (exit 1) on any problem.

Structure checks: every lesson in course.json has a file with a matching id; required fields exist;
exercise answers point at real options; build exercises have words.

TEACH-BEFORE-TEST check (the important one): every Arabic word that appears in a lesson's Read
passage, Practice or Check must already have been *taught*. Taught means it appears in the
Learn word list or the Understand step of this lesson or an earlier one. Prefixes (وَ فَ بِ لِ الْ أَ)
and a few endings (ة, verb ت, tanwīn alif) are peeled off before comparing, so الْبَيْتِ counts
as taught once بَيْتٌ is. Stage 0 (reading) lessons are exempt: they drill letters, not vocabulary.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
errors, warnings = [], []

HARAKAT = re.compile(r"[ً-ْٰـ]")
NON_LETTERS = re.compile(r"[^ء-ي]")
ARABIC_RUN = re.compile(r"[؀-ۿ][؀-ۿً-ْٰـ]*")


def norm(tok):
    t = HARAKAT.sub("", tok)
    t = re.sub("[أإآٱ]", "ا", t)
    return NON_LETTERS.sub("", t)


def candidates(t):
    """All forms a token could be reduced to by peeling known prefixes/suffixes."""
    out = {t}
    frontier = {t}
    for _ in range(4):
        nxt = set()
        for w in frontier:
            for p in ("و", "ف", "ب", "ل", "ك", "ا"):
                if w.startswith(p) and len(w) > 2:
                    nxt.add(w[1:])
            if w.startswith("ال") and len(w) > 3:
                nxt.add(w[2:])
            if w.startswith("لل") and len(w) > 3:
                nxt.add(w[2:])
            for s in ("ة", "ت", "ا"):
                if w.endswith(s) and len(w) > 2:
                    nxt.add(w[:-1])
        nxt -= out
        out |= nxt
        frontier = nxt
    return out


def arabic_tokens(text):
    text = re.sub(r"<[^>]+>", " ", str(text))
    return [n for n in (norm(m) for m in ARABIC_RUN.findall(text)) if n]


def strings_in(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, list):
        for x in obj:
            yield from strings_in(x)
    elif isinstance(obj, dict):
        for x in obj.values():
            yield from strings_in(x)


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        errors.append(f"{path.relative_to(ROOT)}: invalid JSON ({e})")
        return None


course = load(CONTENT / "course.json") or {"stages": []}
order, seen = [], set()
for st in course.get("stages", []):
    for entry in st.get("lessons", []):
        lid = entry.get("id")
        for f in ("id", "title", "ar", "summary"):
            if not entry.get(f):
                errors.append(f"course.json: lesson {lid} missing '{f}'")
        if lid in seen:
            errors.append(f"duplicate lesson id {lid}")
        seen.add(lid)
        order.append((st.get("id"), lid))

taught = set()
for stage_id, lid in order:
    path = CONTENT / "lessons" / f"{lid}.json"
    if not path.exists():
        errors.append(f"{lid}: file missing")
        continue
    L = load(path)
    if L is None:
        continue
    if L.get("id") != lid:
        errors.append(f"{path.name}: id mismatch")
    for f in ("title", "goal", "understand", "practice", "check"):
        if f not in L:
            errors.append(f"{lid}: missing '{f}'")
    for i, w in enumerate(L.get("words", [])):
        if not all(w.get(k) for k in ("ar", "tr", "en")):
            errors.append(f"{lid}: words[{i}] needs ar, tr and en")

    for part in ("practice", "check"):
        for i, ex in enumerate(L.get(part, [])):
            t = ex.get("t", "mcq")
            where = f"{lid} {part}[{i}]"
            if t == "mcq":
                if not ex.get("opts") or not isinstance(ex.get("a"), int) or not 0 <= ex["a"] < len(ex["opts"]):
                    errors.append(f"{where}: mcq answer index out of range")
                if len(set(ex.get("opts", []))) != len(ex.get("opts", [])):
                    errors.append(f"{where}: duplicate options")
            elif t == "build":
                if not ex.get("words") or not ex.get("en"):
                    errors.append(f"{where}: build needs 'en' and 'words'")
            elif t == "match":
                if len(ex.get("pairs", [])) < 2:
                    errors.append(f"{where}: match needs 2+ pairs")
            else:
                errors.append(f"{where}: unknown exercise type {t}")

    # teaching content of this lesson counts as taught for its own read/practice/check
    for s in [*strings_in(L.get("words", [])), *strings_in(L.get("understand", [])), L.get("learnIntro", "")]:
        for tok in arabic_tokens(s):
            taught.update(candidates(tok))

    if stage_id == "reading":
        continue
    for part in ("read", "practice", "check"):
        for s in strings_in(L.get(part, {})):
            for tok in arabic_tokens(s):
                if candidates(tok) & taught:
                    continue
                errors.append(f"{lid} {part}: “{tok}” is used before it is taught")

for path in (CONTENT / "lessons").glob("*.json"):
    if path.stem not in seen:
        errors.append(f"{path.name} isn't listed in course.json")

if errors:
    print("Content problems:\n  " + "\n  ".join(dict.fromkeys(errors)))
    sys.exit(1)
print(f"Content OK: {len(order)} lessons, {len(taught)} taught word forms, nothing tested before it's taught.")

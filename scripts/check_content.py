#!/usr/bin/env python3
"""Validate course content before deploy.

Checks that every JSON file parses, every lesson listed in tracks.json has a
file whose "id" matches, every vocab item has ar/tr/en, and lesson ids are unique.
Exits non-zero (failing the deploy) on any problem.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
errors = []


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        errors.append(f"{path.relative_to(ROOT)}: invalid JSON ({e})")
        return None


tracks = load(CONTENT / "tracks.json") or {"tracks": []}
seen = set()
for track in tracks.get("tracks", []):
    for entry in track.get("lessons", []):
        lid = entry.get("id")
        if lid in seen:
            errors.append(f"duplicate lesson id: {lid}")
        seen.add(lid)
        path = CONTENT / "lessons" / f"{lid}.json"
        if not path.exists():
            errors.append(f"tracks.json lists '{lid}' but {path.relative_to(ROOT)} is missing")
            continue
        lesson = load(path)
        if lesson is None:
            continue
        if lesson.get("id") != lid:
            errors.append(f"{path.name}: id '{lesson.get('id')}' doesn't match filename")
        for i, w in enumerate(lesson.get("vocab", [])):
            missing = [k for k in ("ar", "tr", "en") if not w.get(k)]
            if missing:
                errors.append(f"{path.name}: vocab[{i}] missing {', '.join(missing)}")

for path in (CONTENT / "lessons").glob("*.json"):
    if path.stem not in seen:
        errors.append(f"{path.name} exists but isn't listed in tracks.json")

if errors:
    print("Content problems:\n  " + "\n  ".join(errors))
    sys.exit(1)
print(f"Content OK: {len(seen)} lessons.")

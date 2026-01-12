#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple


RE_SINGLE = re.compile(r"^c-s-(\d+)$")                 # c-s-01
RE_PROJECT = re.compile(r"^c-([a-z0-9-]+)-(\d+)$")     # c-wp-01, c-chx-08, etc


def parse_now(now_str: str | None) -> datetime:
    if not now_str:
        return datetime.now(timezone.utc)
    s = now_str.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(timezone.utc)


def stable_code_to_weeks(code: str) -> int:
    # stable mapping -> [3..30]
    acc = 0
    for i, ch in enumerate(code, start=1):
        acc = (acc + i * ord(ch)) % 100000
    return 3 + (acc % 28)


def compute_times_for_id(cid: str, now: datetime) -> Tuple[str, str]:
    m = RE_SINGLE.match(cid)
    if m:
        n = int(m.group(1))
        create_dt = now - timedelta(days=n * 4)
        update_dt = create_dt + timedelta(hours=n)
        return iso(create_dt), iso(update_dt)

    m = RE_PROJECT.match(cid)
    if m:
        code = m.group(1)
        n = int(m.group(2))
        weeks = stable_code_to_weeks(code)
        create_dt = now - timedelta(weeks=weeks)
        update_dt = create_dt + timedelta(hours=n, days=n)
        return iso(create_dt), iso(update_dt)

    # fallback
    create_dt = now - timedelta(days=10)
    update_dt = create_dt + timedelta(hours=2)
    return iso(create_dt), iso(update_dt)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def ensure_href(item: Dict[str, Any]) -> None:
    if not item.get("href"):
        item["href"] = f"https://chatgpt.com/c/{item['id']}"


def normalize_gizmo(item: Dict[str, Any]) -> None:
    if "gizmoId" in item and item["gizmoId"] == "":
        item["gizmoId"] = None


def patch_item(item: Dict[str, Any], now: datetime, overwrite: bool) -> None:
    if "id" not in item:
        return
    ensure_href(item)
    normalize_gizmo(item)

    create_iso, update_iso = compute_times_for_id(item["id"], now)

    if overwrite or "createTime" not in item:
        item["createTime"] = create_iso
    if overwrite or "updateTime" not in item:
        item["updateTime"] = update_iso
    if overwrite or "pinnedTime" not in item:
        item["pinnedTime"] = None


def strip_js_comments(s: str) -> str:
    # removes //... and /*...*/ comments
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    s = re.sub(r"//.*?$", "", s, flags=re.M)
    return s


def object_literal_to_json_text(src: str) -> str:
    """
    Convert your TS-like object literal into strict JSON text.
    Assumptions:
    - keys are simple identifiers: projects:, gizmoId:, title:, href:, conversations:, singles:, id:
    - values are strings, arrays, objects, numbers, null/true/false
    """
    s = strip_js_comments(src).strip()

    # If file includes "export const DEMO = {...};", extract {...}
    m = re.search(r"export\s+const\s+\w+\s*=\s*(\{.*\})\s*;?\s*$", s, flags=re.S)
    if m:
        s = m.group(1)

    # Remove trailing semicolon if present
    s = re.sub(r";\s*$", "", s)

    # Quote unquoted keys:  foo: -> "foo":
    s = re.sub(r'([{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', s)

    # Remove trailing commas before } or ]
    s = re.sub(r",\s*([}\]])", r"\1", s)

    return s


def load_any(path: str) -> Dict[str, Any]:
    raw = open(path, "r", encoding="utf-8").read()

    # Try strict JSON first
    try:
        return json.loads(raw)
    except Exception:
        pass

    # Try object-literal conversion
    jtxt = object_literal_to_json_text(raw)
    return json.loads(jtxt)


def main() -> int:
    ap = argparse.ArgumentParser(description="Add coherent createTime/updateTime to CGO demo data (JSON or TS-like literal).")
    ap.add_argument("input", help="Input file (.json OR TS-like object literal)")
    ap.add_argument("output", help="Output JSON file")
    ap.add_argument("--now", default="2026-01-12T12:00:00Z", help="Fixed now (default: 2026-01-12T12:00:00Z)")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing createTime/updateTime if present")
    args = ap.parse_args()

    now = parse_now(args.now)
    data = load_any(args.input)

    for p in data.get("projects", []):
        for c in p.get("conversations", []):
            patch_item(c, now, args.overwrite)

    for s in data.get("singles", []):
        patch_item(s, now, args.overwrite)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

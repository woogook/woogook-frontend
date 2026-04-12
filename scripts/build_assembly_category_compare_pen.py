# -*- coding: utf-8 -*-
"""Build assembly-pledge-category-compare.pen from cRt99 in assembly-pledge-category-top.pen."""
from __future__ import annotations

import copy
import json
from pathlib import Path


def remap_ids(obj: object, prefix: str) -> None:
    if isinstance(obj, dict):
        if "id" in obj and isinstance(obj["id"], str):
            obj["id"] = f"{prefix}{obj['id']}"
        for v in obj.values():
            remap_ids(v, prefix)
    elif isinstance(obj, list):
        for x in obj:
            remap_ids(x, prefix)


def apply_badge_colors_iehaeng_daegi(obj: object) -> None:
    """배지 색: 텍스트가 '이행'이면 중립 그레이, '대기'면 레드 톤. 단일 텍스트 자식 프레임만 적용."""
    if isinstance(obj, dict):
        children = obj.get("children")
        if isinstance(children, list) and len(children) == 1:
            ch0 = children[0]
            if isinstance(ch0, dict) and ch0.get("type") == "text":
                content = ch0.get("content")
                if content == "\uc774\ud589":
                    obj["fill"] = "#f4f4f5"
                    obj["stroke"] = {"align": "inside", "thickness": 1, "fill": "#d4d4d8"}
                    ch0["fill"] = "#52525b"
                elif content == "\ub300\uae30":
                    obj["fill"] = "#fef2f2"
                    obj["stroke"] = {"align": "inside", "thickness": 1, "fill": "#fecaca"}
                    ch0["fill"] = "#dc2626"
        for v in obj.values():
            apply_badge_colors_iehaeng_daegi(v)
    elif isinstance(obj, list):
        for x in obj:
            apply_badge_colors_iehaeng_daegi(x)


def find_first(obj: object, node_id_suffix: str) -> dict | None:
    if isinstance(obj, dict):
        nid = obj.get("id")
        if isinstance(nid, str) and nid.endswith(node_id_suffix):
            return obj
        for v in obj.values():
            r = find_first(v, node_id_suffix)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for x in obj:
            r = find_first(x, node_id_suffix)
            if r is not None:
                return r
    return None


def build_screen_anchor(base_rt99: dict, prefix: str, x: int, y: int) -> dict:
    src = copy.deepcopy(base_rt99)
    remap_ids(src, prefix)
    src["x"] = x
    src["y"] = y
    src["name"] = "\uc575\ucee4+\uc804\uccb4 \ubaa9\ub85d (\ud30c\ub780 \uac15\uc870) \u2014 compare pen"
    src["fill"] = "#f9f8f5"

    top5 = find_first(src, f"{prefix}cE66")
    if top5 and top5.get("type") == "text":
        top5["content"] = "\uc804\uccb4 \uacf5\uc57d (\uc0c1\ud0dc\uc21c)"
    sub = find_first(src, f"{prefix}cS44")
    if sub:
        sub["content"] = (
            "\uc644\ub8cc \u2192 \uc9c4\ud589\uc911 \u2192 \ubbf8\ucc29\uc218"
            " \xb7 \ub354\ubcf4\uae30/\ubb34\ud55c\uc2a4\ud06c\ub864"
        )
    note = find_first(src, f"{prefix}cN33")
    if note:
        note["content"] = (
            "\uc575\ucee4 promise_id: \ud574\ub2f9 \uce74\ub4dc \uac15\uc870"
            "\xb7\uadfc\uac70\xb7\uc2a4\ud06c\ub864"
        )

    card3 = find_first(src, f"{prefix}cd3")
    if card3:
        card3["fill"] = "#eff6ff"
        card3["cornerRadius"] = 18
        card3["stroke"] = {"align": "inside", "thickness": 2, "fill": "#2563eb"}

    main = find_first(src, f"{prefix}cM77")
    if main and "children" in main:
        footer = {
            "type": "frame",
            "id": f"{prefix}footMore",
            "name": "pagination_footer",
            "width": "fill_container",
            "layout": "horizontal",
            "justifyContent": "center",
            "alignItems": "center",
            "padding": [20, 0, 8, 0],
            "gap": 8,
            "children": [
                {
                    "type": "text",
                    "id": f"{prefix}footTxt",
                    "fill": "#2563eb",
                    "content": (
                        "\ub354 \ubcf4\uae30 \xb7 \ub2e4\uc74c \ud398\uc774\uc9c0 (cursor)"
                    ),
                    "fontFamily": "Noto Sans KR",
                    "fontSize": 13,
                    "fontWeight": "600",
                }
            ],
        }
        main["children"] = [*main["children"], footer]

    apply_badge_colors_iehaeng_daegi(src)
    return src


def build_screen_compare_b(base_rt99: dict, prefix: str, x: int, y: int) -> dict:
    src = copy.deepcopy(base_rt99)
    remap_ids(src, prefix)
    src["x"] = x
    src["y"] = y
    src["name"] = (
        "\ube44\uad50 B \u2014 \uc21c\ubc88"
        "\xb7\uadfc\uac70 \ud3bc\uce68"
        "\xb7\ubcf4\ub77c \ud1a4"
    )
    src["fill"] = "#faf5ff"

    nav = find_first(src, f"{prefix}cN88")
    if nav:
        nav["fill"] = "#ede9fe"

    top5 = find_first(src, f"{prefix}cE66")
    if top5:
        top5["content"] = "\u3010\ube44\uad50 B\u3011\uc0c1\ud0dc\uc21c \uc804\uccb4 \uacf5\uc57d"
        top5["fill"] = "#6d28d9"
    sub = find_first(src, f"{prefix}cS44")
    if sub:
        sub["content"] = (
            "\uc21c\ubc88 \uc720\uc9c0"
            " \xb7 \uadfc\uac70\ub294 \ud0ed(\ud310\ub2e8 \uadfc\uac70)\uc73c\ub85c \ud3bc\uce68"
        )
        sub["fill"] = "#5b21b6"
    note = find_first(src, f"{prefix}cN33")
    if note:
        note["content"] = "\u2190 \uc67c\ucabd \ud504\ub808\uc784(\uc575\ucee4)\uacfc \ub098\ub780\ud788 \ube44\uad50"
        note["fill"] = "#7c3aed"

    card3 = find_first(src, f"{prefix}cd3")
    if card3:
        card3["fill"] = "#e9d5ff"
        card3["cornerRadius"] = 20
        card3["stroke"] = {"align": "inside", "thickness": 4, "fill": "#7c3aed"}

    main = find_first(src, f"{prefix}cM77")
    if main and "children" in main:
        footer = {
            "type": "frame",
            "id": f"{prefix}footMore",
            "name": "pagination_footer",
            "width": "fill_container",
            "layout": "horizontal",
            "justifyContent": "center",
            "alignItems": "center",
            "padding": [20, 0, 8, 0],
            "gap": 8,
            "children": [
                {
                    "type": "text",
                    "id": f"{prefix}footTxt",
                    "fill": "#2563eb",
                    "content": (
                        "\u25bc \ub354 \ubd88\ub7ec\uc624\uae30"
                        " (\ubb34\ud55c \uc2a4\ud06c\ub864)"
                    ),
                    "fontFamily": "Noto Sans KR",
                    "fontSize": 13,
                    "fontWeight": "600",
                }
            ],
        }
        main["children"] = [*main["children"], footer]

    apply_badge_colors_iehaeng_daegi(src)
    return src


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src_path = root / "src/features/assembly/assembly-pledge-category-top.pen"
    out_path = root / "src/features/assembly/assembly-pledge-category-compare.pen"

    data = json.loads(src_path.read_text(encoding="utf-8"))
    apply_badge_colors_iehaeng_daegi(data)
    src_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    rt99 = next(c for c in data["children"] if c.get("id") == "cRt99")

    # 아트보드: 왼쪽 세로 스택 (펜 너비 390, 간격 24)
    frame_h = int(rt99.get("height", 1100))
    gap = 24
    y_b = frame_h + gap
    y_note = frame_h + gap + frame_h + gap

    note = {
        "type": "frame",
        "id": "cmpNote",
        "name": "README - two wireframe screens",
        "x": 0,
        "y": y_note,
        "width": 390,
        "layout": "vertical",
        "gap": 12,
        "padding": 20,
        "fill": "#f1f5f9",
        "cornerRadius": 12,
        "stroke": {"align": "inside", "thickness": 1, "fill": "#cbd5e1"},
        "children": [
            {
                "type": "text",
                "id": "cmpNoteT1",
                "fill": "#0f172a",
                "content": "assembly-pledge-category-compare.pen",
                "fontFamily": "Noto Sans KR",
                "fontSize": 14,
                "fontWeight": "700",
            },
            {
                "type": "text",
                "id": "cmpNoteT2",
                "fill": "#475569",
                "textGrowth": "fixed-width",
                "width": 350,
                "content": (
                    "TOP5\ub294 assembly-pledge-category-top.pen"
                    " \xb7 \uc774 \ud30c\uc77c\uc740"
                    " \uc575\ucee4(\ud30c\ub780)"
                    " vs \ube44\uad50B(\ubcf4\ub77c)"
                    " \ub450 \ud654\uba74\ub9cc."
                    " \ubaa8\ub450 x=0\uc5d0 \uc138\ub85c \uc2a4\ud0c1."
                ),
                "fontFamily": "Noto Sans KR",
                "fontSize": 12,
                "lineHeight": 1.45,
            },
        ],
    }

    screen_a = build_screen_anchor(rt99, "wa_", 0, 0)
    screen_b = build_screen_compare_b(rt99, "wb_", 0, y_b)

    out = {"version": "2.10", "children": [screen_a, screen_b, note]}
    out_path.write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {out_path.relative_to(root)}")


if __name__ == "__main__":
    main()

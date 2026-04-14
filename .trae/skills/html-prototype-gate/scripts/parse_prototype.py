#!/usr/bin/env python3
import argparse
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

EVENT_ATTRS = {"onclick": "click", "onchange": "change", "onsubmit": "submit"}
REGION_KEYWORDS = {
    "header": "header",
    "nav": "navigation",
    "filter": "filter",
    "search": "search",
    "list": "data_list",
    "table": "data_list",
    "card": "card_list",
    "empty": "empty_state",
    "error": "error_state",
    "modal": "modal",
    "dialog": "modal",
    "footer": "footer",
    "form": "form",
}

class PrototypeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.nodes = []
        self.class_counter = Counter()
        self.interactions = []
        self.text_by_class = Counter()

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        classes = [c for c in attr_map.get("class", "").split() if c]
        node = {
            "tag": tag,
            "id": attr_map.get("id", ""),
            "classes": classes,
            "attrs": attr_map,
        }
        self.nodes.append(node)
        for cls in classes:
            self.class_counter[cls] += 1
        for attr_name, event_name in EVENT_ATTRS.items():
            if attr_name in attr_map:
                self.interactions.append({
                    "selector": selector_for(node),
                    "event": event_name,
                    "intent": infer_intent(attr_map.get(attr_name, "")),
                })

    def handle_data(self, data):
        text = data.strip()
        if not text or not self.nodes:
            return
        classes = self.nodes[-1].get("classes", [])
        for cls in classes:
            self.text_by_class[cls] += 1


def selector_for(node):
    if node.get("id"):
        return f"#{node['id']}"
    if node.get("classes"):
        return "." + ".".join(node["classes"][:2])
    return node.get("tag", "div")


def infer_role(name):
    lowered = name.lower()
    for key, role in REGION_KEYWORDS.items():
        if key in lowered:
            return role
    return "section"


def infer_component_name(selector):
    parts = re.split(r"[^a-zA-Z0-9]+", selector)
    words = [p for p in parts if p and p[0].isalpha()]
    if not words:
        return "PrototypeBlock"
    return "".join(word.capitalize() for word in words)


def infer_intent(handler_text):
    lowered = handler_text.lower()
    if "submit" in lowered:
        return "submit_form"
    if "open" in lowered or "detail" in lowered:
        return "open_detail"
    if "reload" in lowered or "retry" in lowered:
        return "reload"
    return "custom_interaction"


def extract_css_classes(css_text):
    return sorted(set(re.findall(r"\.([a-zA-Z_][a-zA-Z0-9_-]*)", css_text)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True)
    parser.add_argument("--css")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    html_path = Path(args.html)
    css_path = Path(args.css) if args.css else None
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    html_text = html_path.read_text(encoding="utf-8")
    css_text = css_path.read_text(encoding="utf-8") if css_path and css_path.exists() else ""

    parser_obj = PrototypeParser()
    parser_obj.feed(html_text)

    page_name = html_path.stem.replace("-", "_")
    regions = []
    candidates = []
    seen_selectors = set()
    repeat_patterns = []

    for node in parser_obj.nodes:
        selector = selector_for(node)
        if selector in seen_selectors:
            continue
        seen_selectors.add(selector)
        role = infer_role(" ".join(node.get("classes", []) + [node.get("id", ""), node.get("tag", "")]))
        if role != "section" or node["tag"] in {"header", "footer", "nav", "form", "main", "section"}:
            regions.append({"id": selector.lstrip(".#") or node["tag"], "selector": selector, "role": role})

    for cls, count in parser_obj.class_counter.items():
        if count >= 2:
            selector = f".{cls}"
            repeat_patterns.append({"selector": selector, "count": count, "suggest_component": infer_component_name(cls)})
            candidates.append({
                "name": infer_component_name(cls),
                "source_selector": selector,
                "repeatable": count >= 2,
                "props_hint": ["title", "subtitle", "status"] if parser_obj.text_by_class.get(cls) else [],
            })

    source_classes = sorted(set(parser_obj.class_counter.keys()) | set(extract_css_classes(css_text)))

    prototype_structure = {
        "page_name": page_name,
        "regions": regions,
        "repeat_patterns": repeat_patterns,
    }
    component_candidates = {
        "page_component": infer_component_name(page_name),
        "candidates": candidates,
    }
    interaction_map = {"interactions": parser_obj.interactions}
    style_contract = {
        "style_mode": "prototype_css",
        "source_classes": source_classes,
        "mapping_rules": [],
        "tokens_to_resolve": ["spacing", "color", "typography", "radius", "shadow"],
    }
    ui_patch_plan = {
        "target_framework": "react",
        "new_files": [],
        "modify_files": [],
        "states_required": ["loading", "empty", "error", "ready"],
        "notes": ["map repeated prototype blocks to reusable components", "prefer design system components over raw classes"],
    }
    validation_report = {
        "status": "parsed",
        "blocking_issues": [],
        "warnings": [] if regions and candidates else ["prototype parser found limited structure; review artifacts manually"],
    }

    files = {
        "prototype_structure.json": prototype_structure,
        "component_candidates.json": component_candidates,
        "interaction_map.json": interaction_map,
        "style_contract.json": style_contract,
        "ui_patch_plan.json": ui_patch_plan,
        "validation_report.json": validation_report,
    }
    for name, data in files.items():
        (out_dir / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"wrote artifacts to {out_dir}")

if __name__ == "__main__":
    main()

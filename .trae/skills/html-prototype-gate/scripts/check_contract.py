#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

REQUIRED = [
    "prototype_structure.json",
    "component_candidates.json",
    "interaction_map.json",
    "style_contract.json",
    "ui_patch_plan.json",
    "validation_report.json",
]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", required=True)
    args = parser.parse_args()

    artifacts = Path(args.artifacts)
    errors = []

    for name in REQUIRED:
        if not (artifacts / name).exists():
            errors.append(f"missing {name}")

    if errors:
        for err in errors:
            print(err)
        sys.exit(1)

    structure = load_json(artifacts / "prototype_structure.json")
    candidates = load_json(artifacts / "component_candidates.json")
    patch_plan = load_json(artifacts / "ui_patch_plan.json")
    report = load_json(artifacts / "validation_report.json")

    if not structure.get("page_name"):
        errors.append("prototype_structure.json.page_name is empty")
    if not structure.get("regions"):
        errors.append("prototype_structure.json.regions is empty")
    if not candidates.get("page_component"):
        errors.append("component_candidates.json.page_component is empty")
    if not candidates.get("candidates"):
        errors.append("component_candidates.json.candidates is empty")
    if not patch_plan.get("states_required"):
        errors.append("ui_patch_plan.json.states_required is empty")
    if report.get("blocking_issues"):
        errors.append("validation_report.json contains blocking issues")

    if errors:
        for err in errors:
            print(err)
        sys.exit(1)

    print("contract validation passed")

if __name__ == "__main__":
    main()

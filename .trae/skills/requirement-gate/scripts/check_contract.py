#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REQUIRED_CONTRACT_KEYS = [
    "feature_name",
    "goal",
    "actors",
    "must_have",
    "out_of_scope",
    "business_rules",
    "edge_cases",
    "acceptance_criteria",
    "unknowns",
    "blocked",
]

REQUIRED_EXEC_KEYS = [
    "task_type",
    "allowed_modules",
    "forbidden_modules",
    "required_outputs",
    "non_goals",
    "must_verify",
]


def load_json(path: str):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"missing file: {path}")
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError as e:
        raise SystemExit(f"invalid json in {path}: {e}")


def ensure_nonempty_list(data, key, errors):
    value = data.get(key)
    if not isinstance(value, list) or len(value) == 0:
        errors.append(f"{key} must be a non-empty list")


def ensure_string(data, key, errors):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{key} must be a non-empty string")


def main():
    errors = []
    contract = load_json("artifacts/requirement_contract.json")
    execution = load_json("artifacts/execution_contract.json")
    checklist = load_json("artifacts/acceptance_checklist.json")

    for key in REQUIRED_CONTRACT_KEYS:
        if key not in contract:
            errors.append(f"requirement_contract.json missing key: {key}")
    for key in REQUIRED_EXEC_KEYS:
        if key not in execution:
            errors.append(f"execution_contract.json missing key: {key}")

    ensure_string(contract, "feature_name", errors)
    ensure_string(contract, "goal", errors)
    for key in ["actors", "must_have", "out_of_scope", "business_rules", "edge_cases", "acceptance_criteria"]:
        ensure_nonempty_list(contract, key, errors)

    if not isinstance(contract.get("unknowns"), list):
        errors.append("unknowns must be a list")
    if not isinstance(contract.get("blocked"), bool):
        errors.append("blocked must be a boolean")

    for key in REQUIRED_EXEC_KEYS:
        value = execution.get(key)
        if key == "task_type":
            if not isinstance(value, str) or not value.strip():
                errors.append("execution_contract.task_type must be a non-empty string")
        else:
            if not isinstance(value, list) or len(value) == 0:
                errors.append(f"execution_contract.{key} must be a non-empty list")

    checks = checklist.get("checks")
    if not isinstance(checks, list) or len(checks) == 0:
        errors.append("acceptance_checklist.json checks must be a non-empty list")
    else:
        for idx, item in enumerate(checks, start=1):
            if not isinstance(item, dict):
                errors.append(f"check {idx} must be an object")
                continue
            cid = item.get("id")
            desc = item.get("desc")
            if not isinstance(cid, str) or not cid.startswith("AC-"):
                errors.append(f"check {idx} id must start with AC-")
            if not isinstance(desc, str) or not desc.strip():
                errors.append(f"check {idx} desc must be a non-empty string")

    if errors:
        print("contract validation failed:")
        for err in errors:
            print(f" - {err}")
        sys.exit(1)

    print("contract validation passed")


if __name__ == "__main__":
    main()

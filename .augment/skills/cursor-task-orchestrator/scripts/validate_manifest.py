#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REQUIRED_TOP = ["project", "base_branch", "tasks"]
REQUIRED_TASK = [
    "id",
    "title",
    "prompt_file",
    "depends_on",
    "allowed_paths",
    "forbidden_paths",
    "test_commands",
    "expected_artifacts",
    "stop_conditions",
]


def fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


def main() -> int:
    if len(sys.argv) != 2:
        return fail("usage: validate_manifest.py <manifest.json>")

    path = Path(sys.argv[1])
    data = json.loads(path.read_text())

    for key in REQUIRED_TOP:
        if key not in data:
            return fail(f"missing top-level key: {key}")

    if not isinstance(data["tasks"], list) or not data["tasks"]:
        return fail("tasks must be a non-empty list")

    seen = set()
    for task in data["tasks"]:
        for key in REQUIRED_TASK:
            if key not in task:
                return fail(f"task missing key: {key}")
        task_id = task["id"]
        if task_id in seen:
            return fail(f"duplicate task id: {task_id}")
        seen.add(task_id)

    print("manifest valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

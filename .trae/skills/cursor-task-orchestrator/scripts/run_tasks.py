#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path


def load_manifest(path: Path):
    return json.loads(path.read_text())


def ready_tasks(tasks, completed):
    out = []
    for task in tasks:
        if task["id"] in completed:
            continue
        if all(dep in completed for dep in task.get("depends_on", [])):
            out.append(task)
    return out


def ensure_dirs():
    Path("artifacts").mkdir(exist_ok=True)
    Path(".worktrees").mkdir(exist_ok=True)


def create_worktree(task):
    worktree = Path(".worktrees") / task["id"]
    branch = f"task/{task['id'].lower()}"
    if worktree.exists():
        return worktree
    subprocess.run(["git", "worktree", "add", str(worktree), "-b", branch], check=False)
    return worktree


def write_placeholder_result(task_id: str, status: str, note: str):
    payload = {
        "task_id": task_id,
        "status": status,
        "changed_files": [],
        "tests": [],
        "summary": note,
        "risks": [],
        "blockers": [] if status != "blocked" else [note],
    }
    Path(f"artifacts/{task_id}.result.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: run_tasks.py <manifest.json>", file=sys.stderr)
        return 1

    manifest = load_manifest(Path(sys.argv[1]))
    ensure_dirs()
    completed = set()

    # This is a conservative skeleton, not a full runtime.
    # It creates worktrees and writes placeholder artifacts for the operator to replace
    # with real cursor-agent invocation adapted to their environment.
    while len(completed) < len(manifest["tasks"]):
        batch = ready_tasks(manifest["tasks"], completed)
        if not batch:
            print("no runnable tasks remain; possible circular dependency", file=sys.stderr)
            return 2

        progress = False
        for task in batch:
            create_worktree(task)
            write_placeholder_result(
                task["id"],
                "blocked",
                "replace skeleton invocation in scripts/run_tasks.py with your cursor-agent command",
            )
            completed.add(task["id"])
            progress = True

        if not progress:
            return 3

    print("skeleton scheduling complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

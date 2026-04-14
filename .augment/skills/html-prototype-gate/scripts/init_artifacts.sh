#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <workspace>" >&2
  exit 1
fi

WORKSPACE="$1"
ARTIFACTS="$WORKSPACE/artifacts"
mkdir -p "$ARTIFACTS"

cat > "$ARTIFACTS/prototype_structure.json" <<'JSON'
{
  "page_name": "",
  "regions": [],
  "repeat_patterns": []
}
JSON

cat > "$ARTIFACTS/component_candidates.json" <<'JSON'
{
  "page_component": "",
  "candidates": []
}
JSON

cat > "$ARTIFACTS/interaction_map.json" <<'JSON'
{
  "interactions": []
}
JSON

cat > "$ARTIFACTS/style_contract.json" <<'JSON'
{
  "style_mode": "prototype_css",
  "source_classes": [],
  "mapping_rules": [],
  "tokens_to_resolve": ["spacing", "color", "typography", "radius", "shadow"]
}
JSON

cat > "$ARTIFACTS/ui_patch_plan.json" <<'JSON'
{
  "target_framework": "react",
  "new_files": [],
  "modify_files": [],
  "states_required": ["loading", "empty", "error", "ready"],
  "notes": []
}
JSON

cat > "$ARTIFACTS/validation_report.json" <<'JSON'
{
  "status": "initialized",
  "blocking_issues": [],
  "warnings": []
}
JSON

echo "initialized artifacts in $ARTIFACTS"

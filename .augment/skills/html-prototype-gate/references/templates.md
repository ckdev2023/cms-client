# Artifact templates

## prototype_structure.json
- `page_name`: stable page identifier
- `regions`: array of `{id, selector, role}`
- `repeat_patterns`: array of repeated subtree summaries

## component_candidates.json
- `page_component`: final page component name
- `candidates`: array of `{name, source_selector, repeatable, props_hint}`

## interaction_map.json
- `interactions`: array of `{selector, event, intent}`

## style_contract.json
- `style_mode`: usually `prototype_css`
- `source_classes`: sorted class names from html/css
- `mapping_rules`: design-system or framework mapping entries
- `tokens_to_resolve`: spacing, color, typography, radius, shadow

## ui_patch_plan.json
- `target_framework`: react, vue, rn, flutter, etc.
- `new_files`: paths to create
- `modify_files`: paths to patch
- `states_required`: loading, empty, error, ready
- `notes`: short machine-oriented reminders

## validation behavior
The validator fails when:
- required files are missing
- no regions are found
- no component candidates are produced
- `ui_patch_plan.json` has empty `states_required`
- `validation_report.json` records any blocking issue

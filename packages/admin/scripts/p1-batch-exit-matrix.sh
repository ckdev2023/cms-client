#!/usr/bin/env bash
# ── P1 Batch Exit Command Matrix ────────────────────────────────
# Frozen by p1-qa-002-01-p1-batch-exit-command-matrix.
#
# Each P1 batch/PR MUST pass its exit matrix before merge.
# Usage:
#   ./packages/admin/scripts/p1-batch-exit-matrix.sh <batch>
#   ./packages/admin/scripts/p1-batch-exit-matrix.sh <batch> --inc
#   ./packages/admin/scripts/p1-batch-exit-matrix.sh <batch> --dry-run
#
# Batches: 4 | 5
#   4 = P1-A 经营管理签 Step 1–14
#   5 = P1-B 经营管理签 Step 15–20
# ─────────────────────────────────────────────────────────────────

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ADMIN_DIR="$ROOT_DIR/packages/admin"
SERVER_DIR="$ROOT_DIR/packages/server"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

print_header() {
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  P1 Batch Exit Matrix — $1${RESET}"
  echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
  echo ""
}

print_gate() {
  local gate_num="$1"
  local gate_name="$2"
  echo -e "${CYAN}── Gate ${gate_num}: ${gate_name} ──${RESET}"
}

record_result() {
  local name="$1"
  local status="$2"
  if [[ "$status" == "pass" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    RESULTS+=("${GREEN}✓${RESET} ${name}")
  elif [[ "$status" == "skip" ]]; then
    SKIP_COUNT=$((SKIP_COUNT + 1))
    RESULTS+=("${YELLOW}○${RESET} ${name} ${DIM}(skipped)${RESET}")
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    RESULTS+=("${RED}✗${RESET} ${name}")
  fi
}

run_cmd() {
  local label="$1"
  shift
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo -e "  ${DIM}[dry-run]${RESET} $*"
    record_result "$label" "skip"
    return 0
  fi
  echo -e "  ${DIM}\$${RESET} $*"
  if "$@"; then
    record_result "$label" "pass"
  else
    record_result "$label" "fail"
    echo -e "  ${RED}FAILED${RESET}: $label"
  fi
}

run_server_incremental() {
  local label="$1"
  shift
  local filter="$1"
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo -e "  ${DIM}[dry-run]${RESET} cd $SERVER_DIR && npx vitest run --reporter=verbose \"$filter\""
    record_result "$label" "skip"
    return 0
  fi
  echo -e "  ${DIM}\$${RESET} (cd $SERVER_DIR && npx vitest run --reporter=verbose \"$filter\")"
  if (cd "$SERVER_DIR" && npx vitest run --reporter=verbose "$filter"); then
    record_result "$label" "pass"
  else
    record_result "$label" "fail"
    echo -e "  ${RED}FAILED${RESET}: $label"
  fi
}

run_admin_incremental() {
  local label="$1"
  shift
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo -e "  ${DIM}[dry-run]${RESET} npm --workspace @cms/admin exec -- vitest run $*"
    record_result "$label" "skip"
    return 0
  fi
  echo -e "  ${DIM}\$${RESET} npm --workspace @cms/admin exec -- vitest run $*"
  if npm --workspace @cms/admin exec -- vitest run "$@"; then
    record_result "$label" "pass"
  else
    record_result "$label" "fail"
    echo -e "  ${RED}FAILED${RESET}: $label"
  fi
}

print_matrix() {
  echo ""
  echo -e "${BOLD}── Exit Matrix ──${RESET}"
  for r in "${RESULTS[@]}"; do
    echo -e "  $r"
  done
  echo ""
  echo -e "  ${GREEN}pass${RESET}: ${PASS_COUNT}  ${RED}fail${RESET}: ${FAIL_COUNT}  ${YELLOW}skip${RESET}: ${SKIP_COUNT}"
  echo ""
  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    echo -e "${RED}${BOLD}  EXIT GATE: BLOCKED${RESET}"
    echo ""
    return 1
  else
    echo -e "${GREEN}${BOLD}  EXIT GATE: CLEAR${RESET}"
    echo ""
    return 0
  fi
}

# ── P1-A Server Incremental Patterns (Batch 4) ──────────────────

P1A_SERVER_PATTERNS=(
  # Template foundation & BMV
  "src/modules/core/cases/cases.template-foundation"
  "src/modules/core/cases/cases.template-bmv"
  "src/modules/core/cases/bmvTemplateConfig"
  "src/modules/core/cases/cases.types-template-blueprints"
  "src/modules/core/cases/cases.types-bmv-gate"
  # Survey / visa / quote
  "src/modules/core/cases/cases.types-survey-visa-quote"
  # Questionnaire & pre-sign gate
  "src/modules/core/cases/cases.questionnaire-docs"
  "src/modules/core/cases/cases.pre-sign-gate"
  # Workflow step
  "src/modules/core/cases/cases.workflow-step"
  # BMV submission cycle
  "src/modules/core/cases/cases.bmv-submission-cycle"
  # P1-A regression
  "src/modules/core/cases/cases.regression-p1-questionnaire-supplement"
  # Portal intake/leads
  "src/modules/portal/intake/intake.service"
  "src/modules/portal/intake/intake.types"
  "src/modules/portal/leads/leads.service"
  "src/modules/portal/leads/leads.types"
)

# ── P1-A Admin Incremental Patterns (Batch 4) ───────────────────

P1A_ADMIN_PATTERNS=(
  # BMV steps & constants
  "src/views/cases/constantsBmvSteps"
  # Detail aggregate — P1-A slices
  "src/views/cases/model/CaseAdapterDetailAggregate.bmv-contract"
  "src/views/cases/model/CaseAdapterDetailAggregate.survey-quote"
  "src/views/cases/model/CaseAdapterDetailAggregate.overview-contract"
  "src/views/cases/model/CaseAdapterDetailAggregate.info-contract"
  # Pre-sign gate
  "src/views/cases/model/useCreateCaseModel.pre-sign-gate"
  "src/views/cases/model/useCreateCaseModel.create-flow"
  "src/views/cases/model/useCreateCaseModel.focused"
  # Survey/quote write actions
  "src/views/cases/model/useCaseDetailWriteActions.survey-quote.focused"
  # P1 QA suite
  "src/views/cases/model/p1-qa-step-mapping-adapter.focused"
  "src/views/cases/model/p1-qa-button-guard-matrix.focused"
  "src/views/cases/model/p1-qa-write-actions-error-mapping.focused"
  # Validation/billing seam
  "src/views/cases/model/CaseAdapterSupportSeams.validation-billing-focused"
  # Customer downstream smoke
  "src/views/customers/model/CustomerCasesQueryContract"
  "src/views/customers/model/CustomerCreateCaseEntryContract"
  "src/views/customers/model/useCustomerCasesModel.focused"
)

# ── P1-B Server Incremental Patterns (Batch 5) ──────────────────

P1B_SERVER_PATTERNS=(
  # Final payment & COE guard
  "src/modules/core/cases/cases.types-final-payment"
  "src/modules/core/cases/cases.final-payment-coe-guard"
  "src/modules/core/cases/cases.coe-block-guard"
  # Overseas step
  "src/modules/core/cases/cases.types-overseas-step"
  "src/modules/core/cases/cases.overseas-step-branching"
  "src/modules/core/cases/cases.overseas-step-stamps"
  # Visa outcome
  "src/modules/core/cases/cases.visa-outcome"
  # Residence & failure closeout
  "src/modules/core/cases/cases.types-residence-closeout"
  "src/modules/core/cases/cases.types-failure-closeout"
  "src/modules/core/cases/cases.closeout-rules"
  "src/modules/core/cases/cases.success-closeout-gate"
  # P1-B regression
  "src/modules/core/cases/cases.regression-p1-coe-visa-residence"
  "src/modules/core/cases/cases.regression-p1-reminder-closeout"
  # Residence periods module
  "src/modules/core/residence-periods/residencePeriods.service"
  "src/modules/core/residence-periods/residencePeriods.focused"
  "src/modules/core/residence-periods/residencePeriods.reminder-blueprint"
  "src/modules/core/residence-periods/reminderBlueprintContract"
  # Reminders module
  "src/modules/core/reminders/reminders.service"
  # Billing module
  "src/modules/core/billing/billingPlans.service"
  "src/modules/core/billing/paymentRecords.service"
)

# ── P1-B Admin Incremental Patterns (Batch 5) ───────────────────

P1B_ADMIN_PATTERNS=(
  # Detail aggregate — P1-B slices
  "src/views/cases/model/CaseAdapterDetailAggregate.final-payment-gate"
  "src/views/cases/model/CaseAdapterDetailAggregate.residence-reminder"
  "src/views/cases/model/CaseAdapterDetailAggregate.bmv-failure-path"
  "src/views/cases/model/CaseAdapterDetailAggregate.overview-contract"
  "src/views/cases/model/CaseAdapterDetailAggregate.info-contract"
  # Write actions — COE/residence/exception
  "src/views/cases/model/useCaseDetailWriteActions.coe-residence-reminder.focused"
  "src/views/cases/model/useCaseDetailWriteActions.exception-paths.focused"
  # Closeout model
  "src/views/cases/model/useCaseDetailCloseout.focused"
  # P1 QA full suite
  "src/views/cases/model/p1-qa-step-mapping-adapter.focused"
  "src/views/cases/model/p1-qa-button-guard-matrix.focused"
  "src/views/cases/model/p1-qa-write-actions-error-mapping.focused"
  # Customer downstream (full)
  "src/views/customers/model/CustomerCasesQueryContract"
  "src/views/customers/model/CustomerCreateCaseEntryContract"
  "src/views/customers/model/CustomerCreateCaseEntryRegression"
  "src/views/customers/model/useCustomerCasesModel"
)

# ── Helper: join array into pipe-separated vitest filter ─────────

join_filter() {
  local IFS='|'
  echo "$*"
}

P1A_SERVER_FILTER=$(join_filter "${P1A_SERVER_PATTERNS[@]}")
P1A_ADMIN_FILTER=$(join_filter "${P1A_ADMIN_PATTERNS[@]}")
P1B_SERVER_FILTER=$(join_filter "${P1B_SERVER_PATTERNS[@]}")
P1B_ADMIN_FILTER=$(join_filter "${P1B_ADMIN_PATTERNS[@]}")

# ── Batch 4: P1-A Step 1–14 ─────────────────────────────────────

batch_4_full() {
  print_header "Batch 4 — P1-A 经营管理签 Step 1–14"

  print_gate 0 "npm run fix (全量)"
  (cd "$ROOT_DIR" && run_cmd "fix (all)" npm run fix)

  print_gate 1 "npm run guard (全量)"
  (cd "$ROOT_DIR" && run_cmd "guard (all)" npm run guard)

  print_gate 2 "P1-A 增量测试"
  batch_4_incremental

  print_matrix
}

batch_4_incremental() {
  echo -e "  ${CYAN}[server] P1-A focused patterns${RESET}"
  run_server_incremental \
    "server: P1-A template/questionnaire/workflow/pre-sign" \
    "$P1A_SERVER_FILTER"

  echo -e "  ${CYAN}[admin] P1-A focused patterns${RESET}"
  run_admin_incremental \
    "admin: P1-A BMV/survey/pre-sign/QA" \
    "$P1A_ADMIN_FILTER"

  echo -e "  ${CYAN}[admin] cases full regression${RESET}"
  run_admin_incremental \
    "admin: cases/**" \
    "src/views/cases"
}

# ── Batch 5: P1-B Step 15–20 ────────────────────────────────────

batch_5_full() {
  print_header "Batch 5 — P1-B 经营管理签 Step 15–20"

  print_gate 0 "npm run fix (全量)"
  (cd "$ROOT_DIR" && run_cmd "fix (all)" npm run fix)

  print_gate 1 "npm run guard (全量)"
  (cd "$ROOT_DIR" && run_cmd "guard (all)" npm run guard)

  print_gate 2 "P1-B 增量测试"
  batch_5_incremental

  print_matrix
}

batch_5_incremental() {
  echo -e "  ${CYAN}[server] P1-B focused patterns${RESET}"
  run_server_incremental \
    "server: P1-B COE/overseas/residence/closeout" \
    "$P1B_SERVER_FILTER"

  echo -e "  ${CYAN}[admin] P1-B focused patterns${RESET}"
  run_admin_incremental \
    "admin: P1-B final-payment/closeout/residence/QA" \
    "$P1B_ADMIN_FILTER"

  echo -e "  ${CYAN}[admin] cases full regression${RESET}"
  run_admin_incremental \
    "admin: cases/**" \
    "src/views/cases"

  echo -e "  ${CYAN}[admin] cross-module downstream${RESET}"
  run_admin_incremental \
    "admin: customers/**" \
    "src/views/customers"

  run_admin_incremental \
    "admin: documents/**" \
    "src/views/documents"

  run_admin_incremental \
    "admin: dashboard/**" \
    "src/views/dashboard"
}

# ── Main ─────────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
P1 Batch Exit Command Matrix
用法:
  ./packages/admin/scripts/p1-batch-exit-matrix.sh <batch>             完整退出门禁 (fix + guard + 增量测试)
  ./packages/admin/scripts/p1-batch-exit-matrix.sh <batch> --inc       仅运行增量测试 (快速迭代)
  ./packages/admin/scripts/p1-batch-exit-matrix.sh <batch> --dry-run   打印命令，不实际运行

batch:
  4  P1-A 经营管理签 Step 1–14 (template, questionnaire, workflow-step, pre-sign, BMV)
  5  P1-B 经营管理签 Step 15–20 (COE, overseas, residence, reminders, closeout)
EOF
  exit 1
}

BATCH="${1:-}"
MODE="${2:-full}"

if [[ -z "$BATCH" ]]; then
  usage
fi

if [[ "$MODE" == "--dry-run" ]]; then
  DRY_RUN=1
  MODE="full"
fi

case "$BATCH" in
  4)
    if [[ "$MODE" == "--inc" ]]; then
      print_header "Batch 4 — P1-A (增量)"
      batch_4_incremental
      print_matrix
    else
      batch_4_full
    fi
    ;;
  5)
    if [[ "$MODE" == "--inc" ]]; then
      print_header "Batch 5 — P1-B (增量)"
      batch_5_incremental
      print_matrix
    else
      batch_5_full
    fi
    ;;
  *)
    echo -e "${RED}Unknown batch: ${BATCH}${RESET}"
    echo "P1 batches: 4 (P1-A) | 5 (P1-B)"
    exit 1
    ;;
esac

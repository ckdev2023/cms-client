#!/usr/bin/env bash
# ── P0 Batch Exit Command Matrix ────────────────────────────────
# Frozen by p0-qa-002-01-batch-exit-command-matrix.
#
# Each P0 batch/PR MUST pass its exit matrix before merge.
# Usage:
#   ./packages/admin/scripts/p0-batch-exit-matrix.sh <batch>
#   ./packages/admin/scripts/p0-batch-exit-matrix.sh all
#
# Batches: 0 | 1 | 2 | 3 | 4 | 5 | all
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ADMIN_DIR="$ROOT_DIR/packages/admin"
SERVER_DIR="$ROOT_DIR/packages/server"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

passed=0
failed=0
skipped=0

step() {
  echo -e "\n${CYAN}▶ $1${RESET}"
}

pass() {
  echo -e "${GREEN}  ✓ $1${RESET}"
  ((passed++))
}

fail() {
  echo -e "${RED}  ✗ $1${RESET}"
  ((failed++))
}

skip() {
  echo -e "${YELLOW}  ⊘ $1 (not applicable for this batch)${RESET}"
  ((skipped++))
}

run_or_fail() {
  local label="$1"
  shift
  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

summary() {
  echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "  ${GREEN}Passed: $passed${RESET}  ${RED}Failed: $failed${RESET}  ${YELLOW}Skipped: $skipped${RESET}"
  echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ "$failed" -gt 0 ]; then
    echo -e "${RED}EXIT MATRIX FAILED — batch cannot merge.${RESET}"
    exit 1
  else
    echo -e "${GREEN}EXIT MATRIX PASSED.${RESET}"
  fi
}

# ── Gate 0: npm run fix ──────────────────────────────────────────
gate_fix() {
  step "Gate 0: npm run fix (format + lint:fix)"
  (cd "$ROOT_DIR" && run_or_fail "npm run fix" npm run fix)
}

# ── Gate 1: npm run guard (full pipeline) ────────────────────────
gate_guard() {
  step "Gate 1: npm run guard (deps + typecheck + lint + test + build)"
  (cd "$ROOT_DIR" && run_or_fail "npm run guard" npm run guard)
}

# ── Gate 2: Incremental test patterns per batch ──────────────────

# Batch 0: baseline freeze — no code, only docs
incremental_batch_0() {
  step "Gate 2: Batch 0 incremental tests (baseline freeze)"
  skip "Batch 0 is docs-only — no incremental tests required"
}

# Batch 1: P0 server main chain
incremental_batch_1() {
  step "Gate 2: Batch 1 incremental tests (P0 server main chain)"
  (cd "$SERVER_DIR" && run_or_fail "server guard" npm run guard)
}

# Batch 2: P0 admin main chain
incremental_batch_2() {
  step "Gate 2: Batch 2 incremental tests (P0 admin main chain)"

  local patterns=(
    # Adapter layers
    "src/views/cases/model/CaseAdapterMappers"
    "src/views/cases/model/CaseAdapterReaders"
    "src/views/cases/model/CaseAdapterDetailAggregate"
    "src/views/cases/model/CaseAdapterWriteBuilders"
    "src/views/cases/model/CaseAdapterSupportSeams"
    "src/views/cases/model/CaseAdapterMutationResults"
    "src/views/cases/model/CaseCommsLogsAdapter"
    # Repository
    "src/views/cases/model/CaseRepository"
    "src/views/cases/repository"
    # Contract integration
    "src/views/cases/model/CaseListContractIntegration"
    "src/views/cases/model/CaseListSummaryDownstream"
    # Composables
    "src/views/cases/model/useCaseListModel"
    "src/views/cases/model/useCaseDetailModel"
    "src/views/cases/model/useCreateCaseModel"
    "src/views/cases/model/useCasePartyPicker"
    # Query and routing
    "src/views/cases/query"
    "src/views/cases/constants"
    "src/views/cases/fixtures"
    # i18n
    "src/views/cases/i18n-regression"
    "src/views/cases/model/casesI18n"
    # Customer downstream smoke
    "src/views/customers/model/CustomerCasesQueryContract"
    "src/views/customers/model/useCustomerCasesModel.focused"
  )

  local vitest_filter=""
  for p in "${patterns[@]}"; do
    if [ -n "$vitest_filter" ]; then
      vitest_filter="$vitest_filter|$p"
    else
      vitest_filter="$p"
    fi
  done

  (cd "$ADMIN_DIR" && run_or_fail "admin cases incremental tests" \
    npx vitest run --reporter=verbose "$vitest_filter")
}

# Batch 3: P0 cross-module closure
incremental_batch_3() {
  step "Gate 2: Batch 3 incremental tests (P0 cross-module closure)"

  local patterns=(
    # Cross-module link contract and regression
    "src/views/cases/query.cross-module-link-contract"
    "src/views/cases/query.cross-module-link-focused"
    "src/views/cases/query.cross-module-regression"
    "src/views/cases/query.deeplink-regression"
    "src/views/cases/query.family-entry-contract"
    "src/views/cases/query.tab-schema"
    "src/views/cases/query.detail-deeplink"
    # Customer downstream validation set
    "src/views/customers/model/CustomerCasesQueryContract"
    "src/views/customers/model/CustomerCreateCaseEntryContract"
    "src/views/customers/model/CustomerCreateCaseEntryRegression"
    "src/views/customers/model/useCustomerCasesModel.focused"
    "src/views/customers/model/useCustomerCasesModel.query-contract"
    "src/views/customers/model/useCustomerCasesModel.navigation-contract"
    "src/views/customers/model/useCustomerCasesModel.customer-entry-regression"
    # Customer model and components
    "src/views/customers/model/useCustomerDetailModel"
    "src/views/customers/model/useCustomerCreateCaseGateModel"
    "src/views/customers/components/CustomerCasesTab"
    # Cases list/summary downstream
    "src/views/cases/model/CaseListContractIntegration"
    "src/views/cases/model/CaseListSummaryDownstream"
    "src/views/cases/model/CaseRepository.consumer-readiness"
    "src/views/cases/model/caseListRepository.focused"
    # Dashboard
    "src/views/dashboard/QuickActionsPanel"
    "src/views/dashboard/model/useDashboardModel"
    "src/views/dashboard/workPanelData"
    # Documents
    "src/views/documents"
  )

  local vitest_filter=""
  for p in "${patterns[@]}"; do
    if [ -n "$vitest_filter" ]; then
      vitest_filter="$vitest_filter|$p"
    else
      vitest_filter="$p"
    fi
  done

  (cd "$ADMIN_DIR" && run_or_fail "admin cross-module incremental tests" \
    npx vitest run --reporter=verbose "$vitest_filter")
}

# Batch 4: P1-A (Step 1–14)
incremental_batch_4() {
  step "Gate 2: Batch 4 incremental tests (P1-A Step 1–14)"
  (cd "$SERVER_DIR" && run_or_fail "server guard (P1-A)" npm run guard)
  (cd "$ADMIN_DIR" && run_or_fail "admin guard (P1-A)" npm run guard)
}

# Batch 5: P1-B (Step 15–20)
incremental_batch_5() {
  step "Gate 2: Batch 5 incremental tests (P1-B Step 15–20)"
  (cd "$SERVER_DIR" && run_or_fail "server guard (P1-B)" npm run guard)
  (cd "$ADMIN_DIR" && run_or_fail "admin guard (P1-B)" npm run guard)
}

# ── Batch Dispatch ───────────────────────────────────────────────

run_batch() {
  local batch="$1"
  echo -e "\n${CYAN}════════════════════════════════════════════════════════${RESET}"
  echo -e "${CYAN}  P0 Batch ${batch} Exit Matrix${RESET}"
  echo -e "${CYAN}════════════════════════════════════════════════════════${RESET}"

  gate_fix
  gate_guard
  "incremental_batch_${batch}"
  summary
}

# ── Main ─────────────────────────────────────────────────────────

BATCH="${1:-}"

if [ -z "$BATCH" ]; then
  echo "Usage: $0 <batch>"
  echo "  batch: 0 | 1 | 2 | 3 | 4 | 5 | all"
  echo ""
  echo "Batches:"
  echo "  0  Baseline freeze (docs-only)"
  echo "  1  P0 server main chain"
  echo "  2  P0 admin main chain"
  echo "  3  P0 cross-module closure"
  echo "  4  P1-A Step 1–14"
  echo "  5  P1-B Step 15–20"
  echo "  all  Run all batches sequentially"
  exit 1
fi

if [ "$BATCH" = "all" ]; then
  for b in 0 1 2 3 4 5; do
    run_batch "$b"
  done
else
  if ! [[ "$BATCH" =~ ^[0-5]$ ]]; then
    echo -e "${RED}Unknown batch: $BATCH${RESET}"
    exit 1
  fi
  run_batch "$BATCH"
fi

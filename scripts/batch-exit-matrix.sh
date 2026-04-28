#!/usr/bin/env bash
#
# Batch Exit Matrix — P0/P1 每批退出门禁
#
# 用法:
#   scripts/batch-exit-matrix.sh <batch>             # 执行完整退出门禁 (fix + guard + 增量测试)
#   scripts/batch-exit-matrix.sh <batch> --inc        # 仅运行增量测试 (快速迭代)
#   scripts/batch-exit-matrix.sh <batch> --dry-run    # 打印将执行的命令，不实际运行
#   scripts/batch-exit-matrix.sh --list               # 列出所有 batch 及其增量测试范围
#
# batch: b0 | b1 | b2 | b3 | b4 | b5
#
# 每个 batch 固化三道门:
#   Gate 1 — npm run fix          (格式自动修复)
#   Gate 2 — npm run guard        (类型/lint/架构/测试全量门禁)
#   Gate 3 — 增量聚焦测试          (验证本批交付物的受影响范围)
#
# 原则 (来自落地计划):
#   - 每个 batch / PR 都必须显式执行 fix -> guard -> 相关测试
#   - 阶段尾只做汇总复核，不把门禁留到最后一次性执行

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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
  echo -e "${BOLD}  Batch Exit Matrix — $1${RESET}"
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

show_list() {
  cat <<'LISTEOF'
Batch Exit Matrix — 可用批次与增量测试范围
═══════════════════════════════════════════

b0  基线冻结
    scope   : (无代码改动，仅文档)
    guard   : npm run guard (全量，验证无副作用)
    增量测试 : 无

b1  P0 server 主链
    scope   : server
    guard   : npm run server:guard
    增量测试 : server 测试 (已被 guard 覆盖)

b2  P0 admin 主链 (cases)
    scope   : admin
    guard   : npm run admin:guard
    增量测试 :
      - src/views/cases/**                          (cases 全量)
      - src/views/customers/**/CustomerCases*        (customer 下游冒烟)
      - src/views/customers/**/useCustomerCasesModel*(customer 下游冒烟)
      - src/views/customers/**/CustomerCreateCase*   (建案入口回归)

b3  P0 跨模块收口
    scope   : admin
    guard   : npm run admin:guard
    增量测试 :
      - src/views/cases/**                           (cases 全量)
      - src/views/customers/**                       (customers 全量)
      - src/views/documents/**                       (documents 全量)
      - src/views/dashboard/**                       (dashboard 全量)

b4  P1-A 经营管理签 Step 1–14
    scope   : server + admin
    guard   : npm run guard (全量)
    增量测试 :
      server focused:
        - cases.template-foundation/bmv/blueprints   (模板底座)
        - cases.types-bmv-gate/survey-visa-quote     (BMV & 问卷报价类型)
        - cases.questionnaire-docs/pre-sign-gate     (问卷 & 签约前门禁)
        - cases.workflow-step*                        (业务子步骤)
        - cases.bmv-submission-cycle                  (补正循环)
        - cases.regression-p1-questionnaire-supplement (P1-A 回归)
        - portal/intake + portal/leads               (门户)
      admin focused:
        - constantsBmvSteps*                          (BMV 步骤常量)
        - CaseAdapterDetailAggregate.bmv-contract*    (BMV 契约适配)
        - CaseAdapterDetailAggregate.survey-quote*    (问卷报价适配)
        - useCreateCaseModel.pre-sign-gate*           (签约前门禁)
        - useCaseDetailWriteActions.survey-quote*     (问卷报价写入)
        - p1-qa-*                                     (P1 QA 矩阵)
      admin broad:
        - src/views/cases/**                          (cases 全量)
      customer downstream:
        - CustomerCasesQueryContract*                 (下游查询契约)
        - CustomerCreateCaseEntryContract*            (建案入口契约)
        - useCustomerCasesModel.focused*              (客户案件模型)

b5  P1-B 经营管理签 Step 15–20
    scope   : server + admin
    guard   : npm run guard (全量)
    增量测试 :
      server focused:
        - cases.types-final-payment/coe-block-guard   (尾款 & COE 门禁)
        - cases.final-payment-coe-guard               (尾款-COE 联合守卫)
        - cases.types-overseas-step/overseas-step-*    (海外返签)
        - cases.visa-outcome                           (签证结果)
        - cases.types-residence-closeout/failure-closeout (结案类型)
        - cases.closeout-rules/success-closeout-gate   (结案规则)
        - cases.regression-p1-coe-visa-residence       (P1-B COE 回归)
        - cases.regression-p1-reminder-closeout        (P1-B 提醒回归)
        - residence-periods/*                          (在留期间模块)
        - reminders/reminders.service*                 (提醒模块)
        - billing/billingPlans.service*                (收费模块)
        - billing/paymentRecords.service*              (付款模块)
      admin focused:
        - CaseAdapterDetailAggregate.final-payment-gate* (尾款门禁适配)
        - CaseAdapterDetailAggregate.residence-reminder* (在留提醒适配)
        - CaseAdapterDetailAggregate.bmv-failure-path*   (失败路径适配)
        - useCaseDetailWriteActions.coe-residence-*      (COE/在留写入)
        - useCaseDetailWriteActions.exception-paths*     (异常路径写入)
        - useCaseDetailCloseout*                         (结案模型)
        - p1-qa-*                                        (P1 QA 矩阵)
      admin broad:
        - src/views/cases/**                           (cases 全量)
        - src/views/customers/**                       (customers 全量)
        - src/views/documents/**                       (documents 全量)
        - src/views/dashboard/**                       (dashboard 全量)
LISTEOF
}

# ─── Batch 定义 ───────────────────────────────────────────────

gate_fix_all()    { run_cmd "fix (all)"    npm run fix; }
gate_fix_admin()  { run_cmd "fix (admin)"  npm run admin:fix; }
gate_fix_server() { run_cmd "fix (server)" npm --workspace server run fix; }

gate_guard_all()    { run_cmd "guard (all)"    npm run guard; }
gate_guard_admin()  { run_cmd "guard (admin)"  npm run admin:guard; }
gate_guard_server() { run_cmd "guard (server)" npm run server:guard; }

batch_b0() {
  print_header "b0 — 基线冻结"

  print_gate 1 "fix (全量)"
  gate_fix_all

  print_gate 2 "guard (全量，验证无副作用)"
  gate_guard_all

  print_gate 3 "增量测试"
  echo -e "  ${DIM}(b0 无代码改动，无增量测试)${RESET}"
  record_result "incremental: n/a" "pass"

  print_matrix
}

batch_b1() {
  print_header "b1 — P0 server 主链"

  print_gate 1 "fix (server)"
  gate_fix_server

  print_gate 2 "guard (server)"
  gate_guard_server

  print_gate 3 "增量测试 (server 测试已被 guard 覆盖)"
  record_result "incremental: server tests (covered by guard)" "pass"

  print_matrix
}

inc_b1() {
  print_header "b1 — P0 server 主链 (增量)"
  run_cmd "server:test" npm run server:test
  print_matrix
}

batch_b2() {
  print_header "b2 — P0 admin 主链 (cases)"

  print_gate 1 "fix (admin)"
  gate_fix_admin

  print_gate 2 "guard (admin)"
  gate_guard_admin

  print_gate 3 "增量测试 (cases + customer 下游冒烟)"
  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customer → cases downstream" \
    "src/views/customers/model/CustomerCasesQueryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryRegression" \
    "src/views/customers/model/useCustomerCasesModel" \
    "src/views/customers/components/CustomerCasesTab"

  print_matrix
}

inc_b2() {
  print_header "b2 — P0 admin 主链 (增量)"

  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customer → cases downstream" \
    "src/views/customers/model/CustomerCasesQueryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryRegression" \
    "src/views/customers/model/useCustomerCasesModel" \
    "src/views/customers/components/CustomerCasesTab"

  print_matrix
}

batch_b3() {
  print_header "b3 — P0 跨模块收口"

  print_gate 1 "fix (admin)"
  gate_fix_admin

  print_gate 2 "guard (admin)"
  gate_guard_admin

  print_gate 3 "增量测试 (cases + customers + documents + dashboard)"
  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customers/**" \
    "src/views/customers"

  run_admin_incremental \
    "incremental: documents/**" \
    "src/views/documents"

  run_admin_incremental \
    "incremental: dashboard/**" \
    "src/views/dashboard"

  print_matrix
}

inc_b3() {
  print_header "b3 — P0 跨模块收口 (增量)"

  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customers/**" \
    "src/views/customers"

  run_admin_incremental \
    "incremental: documents/**" \
    "src/views/documents"

  run_admin_incremental \
    "incremental: dashboard/**" \
    "src/views/dashboard"

  print_matrix
}

batch_b4() {
  print_header "b4 — P1-A 经营管理签 Step 1–14"

  print_gate 1 "fix (全量)"
  gate_fix_all

  print_gate 2 "guard (全量)"
  gate_guard_all

  print_gate 3 "增量测试 (P1-A server + admin focused + customer 下游冒烟)"

  run_cmd \
    "server: P1-A template/questionnaire/workflow/pre-sign" \
    npm --workspace server exec -- vitest run --reporter=verbose \
    "src/modules/core/cases/cases.template-foundation|src/modules/core/cases/cases.template-bmv|src/modules/core/cases/bmvTemplateConfig|src/modules/core/cases/cases.types-template-blueprints|src/modules/core/cases/cases.types-bmv-gate|src/modules/core/cases/cases.types-survey-visa-quote|src/modules/core/cases/cases.questionnaire-docs|src/modules/core/cases/cases.pre-sign-gate|src/modules/core/cases/cases.workflow-step|src/modules/core/cases/cases.bmv-submission-cycle|src/modules/core/cases/cases.regression-p1-questionnaire-supplement|src/modules/portal/intake/intake.service|src/modules/portal/intake/intake.types|src/modules/portal/leads/leads.service|src/modules/portal/leads/leads.types"

  run_admin_incremental \
    "admin: P1-A BMV/survey/pre-sign/QA focused" \
    "src/views/cases/constantsBmvSteps" \
    "src/views/cases/model/CaseAdapterDetailAggregate.bmv-contract" \
    "src/views/cases/model/CaseAdapterDetailAggregate.survey-quote" \
    "src/views/cases/model/CaseAdapterDetailAggregate.overview-contract" \
    "src/views/cases/model/CaseAdapterDetailAggregate.info-contract" \
    "src/views/cases/model/useCreateCaseModel.pre-sign-gate" \
    "src/views/cases/model/useCreateCaseModel.create-flow" \
    "src/views/cases/model/useCreateCaseModel.focused" \
    "src/views/cases/model/useCaseDetailWriteActions.survey-quote.focused" \
    "src/views/cases/model/p1-qa-step-mapping-adapter.focused" \
    "src/views/cases/model/p1-qa-button-guard-matrix.focused" \
    "src/views/cases/model/p1-qa-write-actions-error-mapping.focused" \
    "src/views/cases/model/CaseAdapterSupportSeams.validation-billing-focused"

  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customer → cases downstream" \
    "src/views/customers/model/CustomerCasesQueryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryRegression" \
    "src/views/customers/model/useCustomerCasesModel" \
    "src/views/customers/components/CustomerCasesTab"

  print_matrix
}

inc_b4() {
  print_header "b4 — P1-A (增量)"

  run_cmd \
    "server: P1-A template/questionnaire/workflow/pre-sign" \
    npm --workspace server exec -- vitest run --reporter=verbose \
    "src/modules/core/cases/cases.template-foundation|src/modules/core/cases/cases.template-bmv|src/modules/core/cases/bmvTemplateConfig|src/modules/core/cases/cases.types-template-blueprints|src/modules/core/cases/cases.types-bmv-gate|src/modules/core/cases/cases.types-survey-visa-quote|src/modules/core/cases/cases.questionnaire-docs|src/modules/core/cases/cases.pre-sign-gate|src/modules/core/cases/cases.workflow-step|src/modules/core/cases/cases.bmv-submission-cycle|src/modules/core/cases/cases.regression-p1-questionnaire-supplement|src/modules/portal/intake/intake.service|src/modules/portal/intake/intake.types|src/modules/portal/leads/leads.service|src/modules/portal/leads/leads.types"

  run_admin_incremental \
    "admin: P1-A BMV/survey/pre-sign/QA focused" \
    "src/views/cases/constantsBmvSteps" \
    "src/views/cases/model/CaseAdapterDetailAggregate.bmv-contract" \
    "src/views/cases/model/CaseAdapterDetailAggregate.survey-quote" \
    "src/views/cases/model/CaseAdapterDetailAggregate.overview-contract" \
    "src/views/cases/model/CaseAdapterDetailAggregate.info-contract" \
    "src/views/cases/model/useCreateCaseModel.pre-sign-gate" \
    "src/views/cases/model/useCreateCaseModel.create-flow" \
    "src/views/cases/model/useCreateCaseModel.focused" \
    "src/views/cases/model/useCaseDetailWriteActions.survey-quote.focused" \
    "src/views/cases/model/p1-qa-step-mapping-adapter.focused" \
    "src/views/cases/model/p1-qa-button-guard-matrix.focused" \
    "src/views/cases/model/p1-qa-write-actions-error-mapping.focused" \
    "src/views/cases/model/CaseAdapterSupportSeams.validation-billing-focused"

  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customer → cases downstream" \
    "src/views/customers/model/CustomerCasesQueryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryContract" \
    "src/views/customers/model/CustomerCreateCaseEntryRegression" \
    "src/views/customers/model/useCustomerCasesModel" \
    "src/views/customers/components/CustomerCasesTab"

  print_matrix
}

batch_b5() {
  print_header "b5 — P1-B 经营管理签 Step 15–20"

  print_gate 1 "fix (全量)"
  gate_fix_all

  print_gate 2 "guard (全量)"
  gate_guard_all

  print_gate 3 "增量测试 (P1-B server + admin focused + cross-module downstream)"

  run_cmd \
    "server: P1-B COE/overseas/residence/closeout" \
    npm --workspace server exec -- vitest run --reporter=verbose \
    "src/modules/core/cases/cases.types-final-payment|src/modules/core/cases/cases.final-payment-coe-guard|src/modules/core/cases/cases.coe-block-guard|src/modules/core/cases/cases.types-overseas-step|src/modules/core/cases/cases.overseas-step-branching|src/modules/core/cases/cases.overseas-step-stamps|src/modules/core/cases/cases.visa-outcome|src/modules/core/cases/cases.types-residence-closeout|src/modules/core/cases/cases.types-failure-closeout|src/modules/core/cases/cases.closeout-rules|src/modules/core/cases/cases.success-closeout-gate|src/modules/core/cases/cases.regression-p1-coe-visa-residence|src/modules/core/cases/cases.regression-p1-reminder-closeout|src/modules/core/residence-periods/residencePeriods.service|src/modules/core/residence-periods/residencePeriods.focused|src/modules/core/residence-periods/residencePeriods.reminder-blueprint|src/modules/core/residence-periods/reminderBlueprintContract|src/modules/core/reminders/reminders.service|src/modules/core/billing/billingPlans.service|src/modules/core/billing/paymentRecords.service"

  run_admin_incremental \
    "admin: P1-B final-payment/closeout/residence/QA focused" \
    "src/views/cases/model/CaseAdapterDetailAggregate.final-payment-gate" \
    "src/views/cases/model/CaseAdapterDetailAggregate.residence-reminder" \
    "src/views/cases/model/CaseAdapterDetailAggregate.bmv-failure-path" \
    "src/views/cases/model/CaseAdapterDetailAggregate.overview-contract" \
    "src/views/cases/model/CaseAdapterDetailAggregate.info-contract" \
    "src/views/cases/model/useCaseDetailWriteActions.coe-residence-reminder.focused" \
    "src/views/cases/model/useCaseDetailWriteActions.exception-paths.focused" \
    "src/views/cases/model/useCaseDetailCloseout.focused" \
    "src/views/cases/model/p1-qa-step-mapping-adapter.focused" \
    "src/views/cases/model/p1-qa-button-guard-matrix.focused" \
    "src/views/cases/model/p1-qa-write-actions-error-mapping.focused"

  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customers/**" \
    "src/views/customers"

  run_admin_incremental \
    "incremental: documents/**" \
    "src/views/documents"

  run_admin_incremental \
    "incremental: dashboard/**" \
    "src/views/dashboard"

  print_matrix
}

inc_b5() {
  print_header "b5 — P1-B (增量)"

  run_cmd \
    "server: P1-B COE/overseas/residence/closeout" \
    npm --workspace server exec -- vitest run --reporter=verbose \
    "src/modules/core/cases/cases.types-final-payment|src/modules/core/cases/cases.final-payment-coe-guard|src/modules/core/cases/cases.coe-block-guard|src/modules/core/cases/cases.types-overseas-step|src/modules/core/cases/cases.overseas-step-branching|src/modules/core/cases/cases.overseas-step-stamps|src/modules/core/cases/cases.visa-outcome|src/modules/core/cases/cases.types-residence-closeout|src/modules/core/cases/cases.types-failure-closeout|src/modules/core/cases/cases.closeout-rules|src/modules/core/cases/cases.success-closeout-gate|src/modules/core/cases/cases.regression-p1-coe-visa-residence|src/modules/core/cases/cases.regression-p1-reminder-closeout|src/modules/core/residence-periods/residencePeriods.service|src/modules/core/residence-periods/residencePeriods.focused|src/modules/core/residence-periods/residencePeriods.reminder-blueprint|src/modules/core/residence-periods/reminderBlueprintContract|src/modules/core/reminders/reminders.service|src/modules/core/billing/billingPlans.service|src/modules/core/billing/paymentRecords.service"

  run_admin_incremental \
    "admin: P1-B final-payment/closeout/residence/QA focused" \
    "src/views/cases/model/CaseAdapterDetailAggregate.final-payment-gate" \
    "src/views/cases/model/CaseAdapterDetailAggregate.residence-reminder" \
    "src/views/cases/model/CaseAdapterDetailAggregate.bmv-failure-path" \
    "src/views/cases/model/CaseAdapterDetailAggregate.overview-contract" \
    "src/views/cases/model/CaseAdapterDetailAggregate.info-contract" \
    "src/views/cases/model/useCaseDetailWriteActions.coe-residence-reminder.focused" \
    "src/views/cases/model/useCaseDetailWriteActions.exception-paths.focused" \
    "src/views/cases/model/useCaseDetailCloseout.focused" \
    "src/views/cases/model/p1-qa-step-mapping-adapter.focused" \
    "src/views/cases/model/p1-qa-button-guard-matrix.focused" \
    "src/views/cases/model/p1-qa-write-actions-error-mapping.focused"

  run_admin_incremental \
    "incremental: cases/**" \
    "src/views/cases"

  run_admin_incremental \
    "incremental: customers/**" \
    "src/views/customers"

  run_admin_incremental \
    "incremental: documents/**" \
    "src/views/documents"

  run_admin_incremental \
    "incremental: dashboard/**" \
    "src/views/dashboard"

  print_matrix
}

# ─── 入口 ─────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
用法:
  scripts/batch-exit-matrix.sh <batch>             完整退出门禁 (fix + guard + 增量测试)
  scripts/batch-exit-matrix.sh <batch> --inc       仅运行增量测试
  scripts/batch-exit-matrix.sh <batch> --dry-run   打印命令，不实际运行
  scripts/batch-exit-matrix.sh --list              列出所有 batch

batch: b0 | b1 | b2 | b3 | b4 | b5
EOF
  exit 1
}

BATCH="${1:-}"
MODE="${2:-full}"

if [[ "$BATCH" == "--list" ]]; then
  show_list
  exit 0
fi

if [[ -z "$BATCH" ]]; then
  usage
fi

if [[ "$MODE" == "--dry-run" ]]; then
  DRY_RUN=1
  MODE="full"
fi

dispatch() {
  local batch="$1"
  local mode="$2"
  case "$batch" in
    b0) batch_b0 ;;
    b1) if [[ "$mode" == "--inc" ]]; then inc_b1; else batch_b1; fi ;;
    b2) if [[ "$mode" == "--inc" ]]; then inc_b2; else batch_b2; fi ;;
    b3) if [[ "$mode" == "--inc" ]]; then inc_b3; else batch_b3; fi ;;
    b4) if [[ "$mode" == "--inc" ]]; then inc_b4; else batch_b4; fi ;;
    b5) if [[ "$mode" == "--inc" ]]; then inc_b5; else batch_b5; fi ;;
    *)  echo -e "${RED}Unknown batch: ${batch}${RESET}"; usage ;;
  esac
}

dispatch "$BATCH" "$MODE"

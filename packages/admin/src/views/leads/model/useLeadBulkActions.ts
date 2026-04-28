import { ref } from "vue";
import type { LeadStatus, LeadSummary } from "../types";
import type { LeadRepository } from "./LeadRepository";

/* ------------------------------------------------------------------ */
/*  批量操作类型                                                        */
/* ------------------------------------------------------------------ */

/** 批量操作种类。 */
export type BulkActionKind =
  | "assign_owner"
  | "adjust_followup"
  | "mark_status"
  | "tags"
  | "export";

/** */
export interface BulkActionResultDetail {
  /** */
  leadId: string;
  /** */
  result: "success" | "skipped";
  /** 跳过原因（仅 skipped 时存在）。 */
  reason?: string;
}

/** */
export interface BulkActionResult {
  /** */
  kind: BulkActionKind;
  /** */
  success: number;
  /** */
  skipped: number;
  /** */
  details: BulkActionResultDetail[];
}

/* ------------------------------------------------------------------ */
/*  跳过规则                                                            */
/* ------------------------------------------------------------------ */

const TERMINAL_STATUSES: ReadonlySet<LeadStatus> = new Set([
  "converted_case",
  "lost",
]);

/**
 * 终态线索（已创建案件 / 已流失）不允许批量操作。
 *
 * @param row - 线索行
 * @returns 是否可操作
 */
export function canBulkOperate(row: LeadSummary): boolean {
  return !TERMINAL_STATUSES.has(row.status);
}

/* ------------------------------------------------------------------ */
/*  内部构建                                                            */
/* ------------------------------------------------------------------ */

function buildResult(
  kind: BulkActionKind,
  selected: LeadSummary[],
): BulkActionResult {
  const details: BulkActionResultDetail[] = selected.map((r) =>
    canBulkOperate(r)
      ? { leadId: r.id, result: "success" as const }
      : {
          leadId: r.id,
          result: "skipped" as const,
          reason: "terminal-status",
        },
  );
  return {
    kind,
    success: details.filter((d) => d.result === "success").length,
    skipped: details.filter((d) => d.result === "skipped").length,
    details,
  };
}

function resolveSelected(
  selectedIds: Set<string>,
  rows: LeadSummary[],
): LeadSummary[] {
  return rows.filter((r) => selectedIds.has(r.id));
}

function operableIds(selected: LeadSummary[]): string[] {
  return selected.filter(canBulkOperate).map((r) => r.id);
}

/* ------------------------------------------------------------------ */
/*  独立操作函数（fixture 模式，不做实际写入）                             */
/* ------------------------------------------------------------------ */

/**
 * 批量指派负责人。
 *
 * @param selectedIds - 选中行 ID 集合
 * @param rows - 完整行列表
 * @param ownerId - 目标负责人 ID
 * @returns 操作结果
 */
export function executeAssignOwner(
  selectedIds: Set<string>,
  rows: LeadSummary[],
  ownerId: string,
): BulkActionResult {
  void ownerId;
  return buildResult("assign_owner", resolveSelected(selectedIds, rows));
}

/**
 * 批量调整下次跟进时间。
 *
 * @param selectedIds - 选中行 ID 集合
 * @param rows - 完整行列表
 * @param date - 目标日期（ISO 字符串）
 * @returns 操作结果
 */
export function executeAdjustFollowUp(
  selectedIds: Set<string>,
  rows: LeadSummary[],
  date: string,
): BulkActionResult {
  void date;
  return buildResult("adjust_followup", resolveSelected(selectedIds, rows));
}

/**
 * 批量标记状态。
 *
 * @param selectedIds - 选中行 ID 集合
 * @param rows - 完整行列表
 * @param status - 目标状态
 * @returns 操作结果
 */
export function executeMarkStatus(
  selectedIds: Set<string>,
  rows: LeadSummary[],
  status: LeadStatus,
): BulkActionResult {
  void status;
  return buildResult("mark_status", resolveSelected(selectedIds, rows));
}

/* ------------------------------------------------------------------ */
/*  Deps                                                               */
/* ------------------------------------------------------------------ */

/**
 *
 */
export interface UseLeadBulkActionsDeps {
  /**
   *
   */
  repository?: LeadRepository;
}

/* ------------------------------------------------------------------ */
/*  Repository-backed action executors                                  */
/* ------------------------------------------------------------------ */

async function execAssign(
  repo: LeadRepository | undefined,
  ids: Set<string>,
  rows: LeadSummary[],
  ownerId: string,
): Promise<BulkActionResult> {
  const selected = resolveSelected(ids, rows);
  const operable = operableIds(selected);
  if (repo && operable.length > 0) {
    await repo.bulkAssign({ leadIds: operable, ownerUserId: ownerId });
  }
  return buildResult("assign_owner", selected);
}

async function execFollowUp(
  repo: LeadRepository | undefined,
  ids: Set<string>,
  rows: LeadSummary[],
  date: string,
): Promise<BulkActionResult> {
  const selected = resolveSelected(ids, rows);
  const operable = operableIds(selected);
  if (repo && operable.length > 0) {
    await repo.bulkFollowup({
      leadIds: operable,
      channel: "phone",
      summary: "",
      nextFollowUp: date,
    });
  }
  return buildResult("adjust_followup", selected);
}

async function execStatus(
  repo: LeadRepository | undefined,
  ids: Set<string>,
  rows: LeadSummary[],
  status: LeadStatus,
): Promise<BulkActionResult> {
  const selected = resolveSelected(ids, rows);
  const operable = operableIds(selected);
  if (repo && operable.length > 0) {
    await repo.bulkStatus({ leadIds: operable, toStatus: status });
  }
  return buildResult("mark_status", selected);
}

async function execTags(
  repo: LeadRepository | undefined,
  ids: Set<string>,
  rows: LeadSummary[],
  tags: string[],
): Promise<BulkActionResult> {
  const selected = resolveSelected(ids, rows);
  const operable = operableIds(selected);
  if (repo && operable.length > 0) {
    await repo.bulkTags({ leadIds: operable, tags });
  }
  return buildResult("tags", selected);
}

async function execExport(
  repo: LeadRepository | undefined,
  ids: Set<string>,
  rows: LeadSummary[],
  format?: "csv" | "xlsx",
): Promise<BulkActionResult> {
  const selected = resolveSelected(ids, rows);
  if (repo) {
    await repo.bulkExport({ leadIds: selected.map((r) => r.id), format });
  }
  return {
    kind: "export",
    success: selected.length,
    skipped: 0,
    details: selected.map((r) => ({
      leadId: r.id,
      result: "success" as const,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

/**
 * 线索列表批量操作：指派负责人、调整跟进时间、标记状态、标签、导出。
 *
 * 当提供 `repository` 时批量操作走服务端请求；否则回退到本地 fixture 模式。
 * 终态（已创建案件/已流失）行自动跳过。
 *
 * @param deps - 可选依赖注入
 * @returns 加载态、最近一次结果、执行方法与清除方法
 */
export function useLeadBulkActions(deps: UseLeadBulkActionsDeps = {}) {
  const loading = ref(false);
  const lastResult = ref<BulkActionResult | null>(null);
  const repo = deps.repository;

  async function run(
    fn: () => BulkActionResult | Promise<BulkActionResult>,
  ): Promise<BulkActionResult> {
    loading.value = true;
    try {
      const result = await fn();
      lastResult.value = result;
      return result;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    lastResult,
    canBulkOperate,
    assignOwner: (ids: Set<string>, rows: LeadSummary[], ownerId: string) =>
      run(() => execAssign(repo, ids, rows, ownerId)),
    adjustFollowUp: (ids: Set<string>, rows: LeadSummary[], date: string) =>
      run(() => execFollowUp(repo, ids, rows, date)),
    markStatus: (ids: Set<string>, rows: LeadSummary[], status: LeadStatus) =>
      run(() => execStatus(repo, ids, rows, status)),
    bulkTags: (ids: Set<string>, rows: LeadSummary[], tags: string[]) =>
      run(() => execTags(repo, ids, rows, tags)),
    bulkExport: (
      ids: Set<string>,
      rows: LeadSummary[],
      format?: "csv" | "xlsx",
    ) => run(() => execExport(repo, ids, rows, format)),
    clearResult: () => {
      lastResult.value = null;
    },
  };
}

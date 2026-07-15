/**
 * cases 模块的类型内核 —— `types.ts` 与 `types-detail.ts` 共同依赖的底座。
 *
 * 存在动因有二，恰好指向同一处：
 *
 * 1. 解 type 环：`types-detail.ts` 需要这批核心枚举，而 `types.ts` 又
 *    re-export `types-detail.ts` 的 21 个符号，二者构成 type 环。开启
 *    depcruise 的 tsPreCompilationDeps 后该环显形（此前 type-only import
 *    不可见）。解法取「抽出共同内核」而非「拆 barrel」——后者要动 types.ts
 *    对外聚合出口的角色，且属 B3（types-detail 枢纽）的范围。
 * 2. 兑现方案书 B2 的「拆 types.ts 核心」：这批跨 Tab 通用的口径枚举本就是
 *    目标结构里 `shared/types-core.ts` 的内容。
 *
 * 收录标准：跨 Tab 通用、自足（不依赖任何其他类型）的口径枚举。
 * 本文件保持叶子：不得 import 本模块任何其他文件。
 *
 * 注意：`CaseDetailTab` 的成员集与 `constants.ts` 的 `CASE_DETAIL_TABS`、
 * `model/useCaseDetailRefetchTags.ts` 的 slice 口径一一对应，且是
 * `detail/tabs/` 九个子域目录的划分依据（messages + log 合并为 comms）。
 */

/** 案件主阶段（S1–S9），与 server 的 `cases.stage` 列同口径。 */
export type CaseStageId =
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "S7"
  | "S8"
  | "S9";

/** 详情 Tab 键；与 `CASE_DETAIL_TABS` 及 refetch slice 同口径。 */
export type CaseDetailTab =
  | "overview"
  | "validation"
  | "documents"
  | "tasks"
  | "info"
  | "forms"
  | "deadlines"
  | "billing"
  | "messages"
  | "log";

/** 三道门禁标识（Gate-A / B / C）。 */
export type GateId = "A" | "B" | "C";

/** 收费状态口径。 */
export type BillingStatusKey =
  | "paid"
  | "partial"
  | "unpaid"
  | "arrears"
  | "waived"
  | "due"
  | "overdue";

/** 日志分类筛选口径。 */
export type LogCategoryKey = "all" | "operation" | "review" | "status";

/** 六种 P0 契约样本键（P0-CONTRACT-DETAIL §16）。 */
export type CaseSampleKey =
  | "work"
  | "family"
  | "gate-fail"
  | "arrears"
  | "correction"
  | "archived";

/** 案件角色键。 */
export type CaseRoleKey = "admin" | "owner" | "assistant" | "finance";

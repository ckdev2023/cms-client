/**
 * leads 模块的类型内核 —— `types.ts` 与 `types-detail.ts` 共同依赖的底座。
 *
 * 存在动因：`types-detail.ts` 需要 `LeadStatus`，而 `types.ts` 又 re-export
 * `types-detail.ts` 的日志/Tab 符号，二者构成 type 环。开启 depcruise 的
 * tsPreCompilationDeps 后该环显形（此前 type-only import 不可见）。
 *
 * 解法取「抽出共同内核」而非「拆 barrel」：后者要改约 30 处消费方的 import，
 * 且 `types.ts` 作为对外聚合出口的角色是刻意的。内核下沉后依赖单向：
 * types.ts → types-core、types-detail → types-core、types.ts → types-detail。
 *
 * 本文件保持叶子：不得 import 本模块任何其他文件。
 */

/**
 * 线索状态（03 §3.6）。
 *
 * - `new` — 新咨询
 * - `following` — 跟进中
 * - `pending_sign` — 待签约
 * - `signed` — 已签约
 * - `converted_case` — 已创建案件（原型扩展态，仅 UI 使用）
 * - `lost` — 已流失
 */
export type LeadStatus =
  | "new"
  | "following"
  | "pending_sign"
  | "signed"
  | "converted_case"
  | "lost";

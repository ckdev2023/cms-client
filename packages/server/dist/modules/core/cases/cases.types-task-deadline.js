// ────────────────────────────────────────────────────────────────
// Task / Deadline / Reminder 案件视角读模型 — 冻结契约
//
// 案件详情 tasks tab 消费 tasks 列表端点（caseId 过滤）；
// 案件详情 deadlines tab 消费：
//   1. Case 本体期限字段派生的 deadline 列表（聚合 DTO 内联）
//   2. reminders 列表端点（caseId 过滤）
//
// P0 边界：CaseDeadline 表尚未落地，deadline 由 Case 本体
// 日期字段（due_at / residence_expiry_date / submission_date /
// result_date）派生为只读视图。P1 落地 case_deadlines 表后，
// 此处追加 `CaseDeadlineEntityDto` 并保持向后兼容。
//
// 以下类型描述 admin adapter 消费的 DTO 形状，
// 与现有 REST 端点的返回值一一对应。
// ────────────────────────────────────────────────────────────────
export {};
//# sourceMappingURL=cases.types-task-deadline.js.map

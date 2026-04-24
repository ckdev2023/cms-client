// ────────────────────────────────────────────────────────────────
// Communication-Log / Timeline 案件视角读模型 — 冻结契约
//
// 案件详情 messages tab 消费 communication-logs 列表端点；
// 案件详情 log tab 消费 timeline 列表端点（entityType=case）。
//
// 以下类型描述 admin adapter 消费的 DTO 形状，
// 与现有 REST 端点的返回值一一对应。
// ────────────────────────────────────────────────────────────────

/**
 * 案件视角沟通记录查询参数。
 *
 * 映射端点：`GET /api/communication-logs?caseId=:caseId`
 */
export type CaseCommunicationLogListInput = {
  caseId: string;
  page?: number;
  limit?: number;
};

/**
 * 案件视角沟通记录 DTO — 与 `CommunicationLog` 核心实体同构。
 *
 * admin adapter 消费此结构映射为 `MessageItem`。
 * 字段语义：
 * - `channelType`：phone | email | meeting | line | wechat | other
 * - `direction`：inbound | outbound
 * - `visibleToClient`：true = 客户可见，false = 内部备注
 */
export type CaseCommunicationLogDto = {
  id: string;
  caseId: string | null;
  customerId: string | null;
  channelType: string;
  direction: string;
  subject: string | null;
  contentSummary: string | null;
  fullContent: string | null;
  visibleToClient: boolean;
  createdBy: string | null;
  followUpRequired: boolean;
  followUpDueAt: string | null;
  createdAt: string;
};

/**
 * 案件视角沟通记录列表响应。
 */
export type CaseCommunicationLogListResult = {
  items: CaseCommunicationLogDto[];
  total: number;
};

/**
 * 案件视角时间线查询参数。
 *
 * 映射端点：`GET /api/timeline?entityType=case&entityId=:caseId`
 */
export type CaseTimelineListInput = {
  caseId: string;
  limit?: number;
};

/**
 * 案件视角时间线日志 DTO — 与 `TimelineLog` 核心实体同构。
 *
 * admin adapter 消费此结构映射为 `LogEntry`。
 * 常见 action 值（entity_type=case 时）：
 * - `case.created` / `case.updated` / `case.deleted`
 * - `case.status_changed` (payload.from / payload.to)
 * - `case.billing_risk_acknowledged`
 * - `case.post_approval_stage_changed`
 * - `case.cross_group_created` / `case.group_transferred`
 * - `communication_log.created` / `communication_log.updated`
 *   （沟通记录关联到案件时的交叉写入）
 */
export type CaseTimelineLogDto = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

/**
 * 案件日志分类 — 与 admin `LogCategoryKey` 对齐。
 *
 * P0-CONTRACT-DETAIL §13：全部 / 操作日志 / 审核日志 / 状态変更日志。
 */
export type CaseLogCategory = "operation" | "review" | "status";

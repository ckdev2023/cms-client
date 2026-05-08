import type { DocumentItemStatus, DocumentListItem } from "../types";
import type {
  DocumentItem,
  DocumentItemActions,
  DocumentFileVersion,
  DocumentReviewRecord,
  DocumentReminderRecord,
} from "../../cases/types-detail";
import type { DocumentFileDto } from "./DocumentRepositoryTypes";
import {
  DOCUMENT_STATUSES,
  LEGACY_STATUS_MAP,
  STATUS_TRANSITIONS,
  isFollowUpAllowed,
} from "../constants";

/**
 * DocumentListItem → DocumentItem（案件详情资料行）变换时，
 * 可选注入的懒加载子记录。Tab 展开后由调用方异步拉取再注入。
 */
export interface DetailItemEnrichment {
  /**
   *
   */
  versions?: DocumentFileVersion[];
  /**
   *
   */
  reviews?: DocumentReviewRecord[];
  /**
   *
   */
  reminders?: DocumentReminderRecord[];
}

// ─── Forward: DocumentListItem → DocumentItem ────────────────────

/**
 * `deriveActions` 的可选上下文：当 `DocumentListItem` 携带后端原始状态与
 * 类别时，传入以便"催办"按钮的可见性与服务端 `followUp` 守卫精确对齐。
 */
export interface DeriveActionsContext {
  /** 后端原始状态（如 `waiting_upload` / `revision_required` / `pending`）。 */
  backendStatus?: string | null;
  /** 资料项类别（如 `standard` / `questionnaire`）。 */
  category?: string | null;
}

/**
 * 根据资料项状态推导行内操作按钮的可见性。
 *
 * `canRemind` 必须与服务端 `followUp(...)` 守卫保持一致：
 * - 当上下文提供 `backendStatus` 时，使用 `isFollowUpAllowed`（精确判断）。
 * - 否则回退到归一化状态推断（`pending` 视作 `waiting_upload`，
 *   `rejected` 视作 `revision_required`），以兼容尚未携带原始状态的旧调用。
 *
 * @param status - 前端归一化状态
 * @param ctx - 可选上下文（后端原始状态 + 资料类别），用于精确判断
 * @returns 行内动作可见性标志
 */
export function deriveActions(
  status: DocumentItemStatus,
  ctx?: DeriveActionsContext,
): DocumentItemActions {
  const transitions = STATUS_TRANSITIONS[status] ?? [];
  const remindBackend =
    ctx?.backendStatus ??
    (status === "pending"
      ? "waiting_upload"
      : status === "rejected"
        ? "revision_required"
        : status);
  return {
    canApprove: status === "uploaded_reviewing",
    canReject: status === "uploaded_reviewing",
    canRemind: isFollowUpAllowed(remindBackend, ctx?.category ?? undefined),
    canWaive: transitions.includes("waived"),
    canRegister:
      status === "pending" || status === "rejected" || status === "expired",
    canReference:
      status === "pending" || status === "rejected" || status === "expired",
  };
}

/**
 * 案件详情资料行副标题构造规则（W-6 修复，bug254）：
 * - 案件名在详情页头部已展示，再注入会冗余，且当 `/cases?view=summary` 没命中
 *   目标案件时 `caseName` 会回退为 `caseId`（UUID），直接泄漏到 UI。
 * - 改用「资料编号 · 期限」语义，与 `adaptCaseDocumentGroups` 的旧路径对齐。
 * - 手动添加项 `checklistItemCode` 形如 `manual:<uuid>`，属内部生成的标识符，跳过。
 *
 * @param item - 资料列表项
 * @returns 副标题文案；无可展示信息时返回空串
 */
function buildMeta(item: DocumentListItem): string {
  const parts: string[] = [];
  const code = item.checklistItemCode;
  if (code && !code.startsWith("manual:")) parts.push(code);
  if (item.dueDate) parts.push(`期限: ${item.dueDateLabel}`);
  return parts.join(" · ");
}

function buildReferenceLabel(item: DocumentListItem): string | null {
  if (item.referenceCount > 1) return `${item.referenceCount} 件で共有`;
  return null;
}

/**
 * 把跨案件资料列表行（API adapter 产出）转换为案件详情资料行模型。
 *
 * `versions` / `reviews` / `reminders` 默认为空数组；
 * 调用方通过 `enrichment` 注入懒加载数据（Tab 展开时异步拉取）。
 *
 * @param item - 跨案件资料列表行
 * @param enrichment - 可选的子记录（版本/审核/催办）
 * @returns 案件详情资料行
 */
export function toCaseDetailItem(
  item: DocumentListItem,
  enrichment?: DetailItemEnrichment,
): DocumentItem {
  const statusDef = DOCUMENT_STATUSES[item.status];
  const ctx: DeriveActionsContext = {
    backendStatus: item.backendStatus,
    category: item.category,
  };
  const actions = deriveActions(item.status, ctx);
  return {
    name: item.name,
    meta: buildMeta(item),
    status: item.status,
    statusLabelKey: statusDef?.labelKey ?? item.status,
    canWaive: actions.canWaive,
    relativePath: item.relativePath,
    referenceLabelKey: buildReferenceLabel(item),
    referenceCount: item.referenceCount,
    versions: enrichment?.versions ?? [],
    reviews: enrichment?.reviews ?? [],
    reminders: enrichment?.reminders ?? [],
    actions,
    backendStatus: item.backendStatus,
    category: item.category,
  };
}

/**
 * 批量转换 `DocumentListItem[]` → `DocumentItem[]`。
 *
 * @param items - 跨案件资料列表行数组
 * @param enrichmentMap - 按资料项 id 索引的子记录 map（可选）
 * @returns 案件详情资料行数组
 */
export function toCaseDetailItems(
  items: readonly DocumentListItem[],
  enrichmentMap?: ReadonlyMap<string, DetailItemEnrichment>,
): DocumentItem[] {
  return items.map((item) =>
    toCaseDetailItem(item, enrichmentMap?.get(item.id)),
  );
}

// ─── Reverse: DocumentItem → DocumentListItem（部分字段） ────────

/**
 * 反向映射所需的上下文（`DocumentItem` 本身不携带 case 信息）。
 */
export interface ReverseContext {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  dueDate?: string | null;
  /**
   *
   */
  lastReminderAt?: string | null;
}

function resolveStatusFromLegacy(raw: string): DocumentItemStatus {
  return (LEGACY_STATUS_MAP[raw] ?? "pending") as DocumentItemStatus;
}

/**
 * 把案件详情资料行 + 上下文反向映射为 `DocumentListItem`。
 *
 * 用于"从案件详情 Tab 侧发起跨案件操作"等少数场景；
 * `sharedExpiryRisk` / `referenceCount` 在反向路径无法精确还原，给出安全兜底。
 *
 * @param detailItem - 案件详情资料行
 * @param ctx - 反向映射上下文
 * @returns 跨案件资料列表行
 */
export function toDocumentListItem(
  detailItem: DocumentItem,
  ctx: ReverseContext,
): DocumentListItem {
  const status = resolveStatusFromLegacy(detailItem.status);
  const dueDate = ctx.dueDate ?? null;
  const lastReminderAt = ctx.lastReminderAt ?? null;
  return {
    id: ctx.id,
    name: detailItem.name,
    caseId: ctx.caseId,
    caseName: ctx.caseName,
    provider: "main_applicant",
    status,
    dueDate,
    dueDateLabel: dueDate ?? "—",
    lastReminderAt,
    lastReminderAtLabel: lastReminderAt ?? "—",
    relativePath: detailItem.relativePath ?? null,
    sharedExpiryRisk:
      (detailItem.referenceCount ?? 1) > 1 && status === "expired",
    referenceCount: detailItem.referenceCount ?? 1,
  };
}

// ─── DocumentFileDto → DocumentFileVersion ───────────────────────

/**
 * 把仓储层 `DocumentFileDto` 转换为案件详情的 `DocumentFileVersion`。
 *
 * @param dto - 仓储层文件 DTO
 * @returns 案件详情版本记录
 */
export function toFileVersion(dto: DocumentFileDto): DocumentFileVersion {
  return {
    version: dto.versionNo,
    fileName: dto.fileName,
    relativePath: dto.relativePath ?? "",
    registeredAt: dto.uploadedAt || dto.createdAt,
    storageType: dto.storageType,
    referenceSource: dto.relativePath ? "本資料項登記" : "引用自他案件",
    expiryDate: dto.expiryDate,
  };
}

/**
 * 批量转换 `DocumentFileDto[]` → `DocumentFileVersion[]`。
 *
 * @param dtos - 仓储层文件 DTO 数组
 * @returns 案件详情版本记录数组
 */
export function toFileVersions(
  dtos: readonly DocumentFileDto[],
): DocumentFileVersion[] {
  return dtos.map(toFileVersion);
}

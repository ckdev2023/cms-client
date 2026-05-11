/**
 * checklist-preview（含条目）的请求/解析契约；
 * 与 `GET /cases/checklist-preview?includeItems=1` items 字段对齐。
 */
export type ChecklistPreviewLineItem = {
  /**
   *
   */
  code: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  ownerSide: string;
  /**
   *
   */
  category: string | null;
  /**
   *
   */
  requiredFlag: boolean;
  /**
   *
   */
  providedByRole: string | null;
};

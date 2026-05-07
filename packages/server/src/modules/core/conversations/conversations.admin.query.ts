import type { ConversationListInput } from "./conversations.admin.types";

/**
 * 一覧検索の WHERE 条件を組み立てる。
 *
 * カラム参照は `c.` プレフィックス付き（conversations テーブルエイリアス前提）。
 * @param input 検索条件
 * @param where WHERE 句の配列（追記される）
 * @param params バインドパラメータ配列（追記される）
 */
export function buildListWhere(
  input: ConversationListInput,
  where: string[],
  params: unknown[],
): void {
  if (input.status) {
    params.push(input.status);
    where.push(`c.status = $${String(params.length)}`);
  }
  if (input.ownerUserId) {
    params.push(input.ownerUserId);
    where.push(`c.owner_user_id = $${String(params.length)}`);
  }
  if (input.leadId) {
    params.push(input.leadId);
    where.push(`c.lead_id = $${String(params.length)}`);
  }
  if (input.customerId) {
    params.push(input.customerId);
    where.push(`c.customer_id = $${String(params.length)}`);
  }
  if (input.caseId) {
    params.push(input.caseId);
    where.push(`c.case_id = $${String(params.length)}`);
  }
  if (input.appUserId) {
    params.push(input.appUserId);
    where.push(`c.app_user_id = $${String(params.length)}`);
  }
  if (input.unreadOnly) {
    where.push(
      `(c.unread_count_staff_tenant > 0 or c.unread_count_staff_owner > 0)`,
    );
  }
  if (input.search) {
    params.push(`%${input.search}%`);
    const si = String(params.length);
    where.push(
      `(exists (select 1 from app_users _au where _au.id = c.app_user_id and (_au.name ilike $${si} or _au.email ilike $${si} or _au.phone ilike $${si})))`,
    );
  }
}

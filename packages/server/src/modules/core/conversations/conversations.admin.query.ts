import type { ConversationListInput } from "./conversations.admin.types";

/**
 * 一覧検索の WHERE 条件を組み立てる。
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
    where.push(`status = $${String(params.length)}`);
  }
  if (input.ownerUserId) {
    params.push(input.ownerUserId);
    where.push(`owner_user_id = $${String(params.length)}`);
  }
  if (input.leadId) {
    params.push(input.leadId);
    where.push(`lead_id = $${String(params.length)}`);
  }
  if (input.customerId) {
    params.push(input.customerId);
    where.push(`customer_id = $${String(params.length)}`);
  }
  if (input.caseId) {
    params.push(input.caseId);
    where.push(`case_id = $${String(params.length)}`);
  }
  if (input.appUserId) {
    params.push(input.appUserId);
    where.push(`app_user_id = $${String(params.length)}`);
  }
  if (input.unreadOnly) {
    where.push(
      `(unread_count_staff_tenant > 0 or unread_count_staff_owner > 0)`,
    );
  }
  if (input.search) {
    params.push(`%${input.search}%`);
    const si = String(params.length);
    where.push(
      `(exists (select 1 from app_users au where au.id = conversations.app_user_id and (au.name ilike $${si} or au.email ilike $${si} or au.phone ilike $${si})))`,
    );
  }
}

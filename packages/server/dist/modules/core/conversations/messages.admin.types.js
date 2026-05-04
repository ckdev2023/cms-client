const VALID_KINDS = new Set([
  "text",
  "system_event",
  "intake_link",
  "quote_link",
  "sign_link",
]);
const VALID_VISIBLE_SCOPES = new Set(["internal_only", "client_visible"]);
/**
 * kind の妥当性を検証する。
 * @param kind メッセージ種別
 * @returns 検証済みの kind
 */
export function validateKind(kind) {
  const k = kind ?? "text";
  if (!VALID_KINDS.has(k)) {
    throw new Error("Invalid message kind: " + k);
  }
  return k;
}
/**
 * visible_scope の妥当性を検証する。
 * @param scope 可視スコープ
 * @returns 検証済みの visible_scope
 */
export function validateVisibleScope(scope) {
  const s = scope ?? "client_visible";
  if (!VALID_VISIBLE_SCOPES.has(s)) {
    throw new Error("Invalid visible_scope: " + s);
  }
  return s;
}
export const MSG_ADMIN_COLS = `id, conversation_id, org_id, sender_type, sender_id, original_language, original_text, translated_text_ja, translated_text_zh, translated_text_en, translation_status, kind, visible_scope, created_at`;
//# sourceMappingURL=messages.admin.types.js.map

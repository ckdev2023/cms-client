/**
 * 建案自动插入的初始任务在 DB 中标题固定为日文；前端按 `sourceType` + `taskType` 映射为 i18n 键。
 */
/**
 * `taskType` → `cases.detail.tasks.initial.*` 的 i18n 键映射表。
 */
const INITIAL_AUTO_CREATE_TASK_TITLE_KEYS: Readonly<Record<string, string>> = {
  document_follow_up: "cases.detail.tasks.initial.documentFollowUp",
  client_contact: "cases.detail.tasks.initial.clientContact",
};

/**
 * 解析建案自动创建任务在界面层应使用的 i18n 标题键。
 *
 * @param sourceType - 任务 `sourceType`（如 `auto_create`）
 * @param taskType - 任务 `taskType`（如 `document_follow_up`）
 * @returns 已注册的 i18n 键；无法解析时返回 `undefined`
 */
export function resolveInitialAutoCreateTaskTitleKey(
  sourceType: string | null | undefined,
  taskType: string | null | undefined,
): string | undefined {
  if (sourceType !== "auto_create") return undefined;
  const tt = taskType?.trim();
  if (!tt) return undefined;
  return INITIAL_AUTO_CREATE_TASK_TITLE_KEYS[tt];
}

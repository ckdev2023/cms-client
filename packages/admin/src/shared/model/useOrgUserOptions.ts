/**
 * 跨模块 Org User 选项管理。
 *
 * 运行期通过 `registerUserAliases` 把后端 `/api/users` 返回的
 * `{ id, displayName }` 注册到一个响应式别名表，让 `resolveUserLabel`
 * 透明地把 DB UUID 翻译为人类可读的显示名。
 *
 * 别名表使用 Vue `ref` 持有，注册后能触发 `computed` 重算，
 * 因此调用方（如 `CaseEditModal.vue`）首屏拿到 UUID 也会在
 * App 启动拉到用户列表后立即 re-render 为显示名。
 */
import { ref } from "vue";

/**
 * 来自 `/api/users` 的最小别名输入。
 */
export interface UserAliasEntry {
  /**
   *
   */
  id: string;
  /**
   *
   */
  displayName: string;
}

/**
 * 供选择器/下拉使用的选项格式。
 */
export interface UserSelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userAliasesRef = ref<ReadonlyMap<string, string>>(new Map());

function looksLikeUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

/**
 * 注册后端 `/api/users` 的 `{ id, displayName }` 列表到运行期别名表。
 *
 * @param entries - 待注册的用户列表
 */
export function registerUserAliases(
  entries: ReadonlyArray<UserAliasEntry>,
): void {
  const next = new Map(userAliasesRef.value);
  let mutated = false;
  for (const entry of entries) {
    const id = entry.id?.trim();
    const displayName = entry.displayName?.trim();
    if (!id || !displayName) continue;
    if (next.get(id) !== displayName) {
      next.set(id, displayName);
      mutated = true;
    }
  }
  if (mutated) userAliasesRef.value = next;
}

/**
 * 清空运行期别名表，仅供测试与登出场景使用。
 */
export function clearUserAliases(): void {
  if (userAliasesRef.value.size === 0) return;
  userAliasesRef.value = new Map();
}

/**
 * 解析用户 UUID 为显示名称。
 *
 * @param id - 用户 UUID
 * @returns 已注册时返回 displayName；未注册 UUID 返回 `"—"`；非 UUID 原样返回
 */
export function resolveUserLabel(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "—";
  const found = userAliasesRef.value.get(trimmed);
  if (found) return found;
  if (looksLikeUuid(trimmed)) return "—";
  return trimmed;
}

/**
 * 返回已注册用户的选项列表，供选择器/下拉使用。
 *
 * @returns 包含 value（UUID）+ label（displayName）的用户数组
 */
export function getActiveUserOptions(): UserSelectOption[] {
  const result: UserSelectOption[] = [];
  for (const [id, displayName] of userAliasesRef.value) {
    result.push({ value: id, label: displayName });
  }
  return result;
}

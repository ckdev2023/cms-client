import type { KVStorage } from "./KVStorage";

/**
 * 内存 KVStorage 实现。
 *
 * 用途：
 * - 适合开发/测试场景（不做持久化）
 * - 可作为真实存储实现的替身（mock）
 */
export class MemoryStorage implements KVStorage {
  private readonly map = new Map<string, string>();

  /**
   * 读取字符串值。
   *
   * @param key 键
   * @returns 字符串值或 null
   */
  async getString(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  /**
   * 写入字符串值。
   *
   * @param key 键
   * @param value 值
   * @returns 写入结果
   */
  async setString(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  /**
   * 删除指定 key。
   *
   * @param key 键
   * @returns 删除结果
   */
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

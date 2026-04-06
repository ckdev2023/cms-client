/**
 * KV 存储接口。
 *
 * 用途：
 * - 为业务提供简单的 key/value 字符串存取能力
 * - 便于在不同实现之间切换（内存/AsyncStorage/MMKV 等）
 */
export type KVStorage = {
  /**
   * 读取字符串值。
   *
   * @param key 键
   * @returns 字符串值或 null
   */
  getString(key: string): Promise<string | null>;
  /**
   * 写入字符串值。
   *
   * @param key 键
   * @param value 值
   * @returns 写入结果
   */
  setString(key: string, value: string): Promise<void>;
  /**
   * 删除指定 key。
   *
   * @param key 键
   * @returns 删除结果
   */
  delete(key: string): Promise<void>;
};

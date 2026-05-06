const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?81[- ]?)?[0-9][0-9- ]{6,15}[0-9]$/;

/**
 * 简易 email 格式校验（非 RFC 5322 完整实现，覆盖常见输入场景）。
 *
 * @param value - 待检字符串
 * @returns 是否匹配 email 格式
 */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * 日本电话号码格式校验（固定电话 / 携帯 / +81 国際プレフィクス）。
 *
 * @param value - 待检字符串
 * @returns 是否匹配电话格式
 */
export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

/**
 * sessionStorage 键：从「案件新建」向导跳转到客户档案后，用于恢复向导 hash。
 */
export const SESSION_KEY_RESUME_CASE_CREATE_HASH =
  "gyosei.admin.resumeCaseCreateHash";

/**
 * 离开建案向导前往客户详情前写入当前 URL hash。
 *
 * @returns 无
 */
export function persistResumeCaseCreateHash(): void {
  try {
    sessionStorage.setItem(
      SESSION_KEY_RESUME_CASE_CREATE_HASH,
      window.location.hash,
    );
  } catch {
    /* quota / private mode */
  }
}

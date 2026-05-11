/**
 * sessionStorage 键：从「案件新建」向导跳转到客户档案后，用于恢复向导 hash。
 */
export const SESSION_KEY_RESUME_CASE_CREATE_HASH =
  "gyosei.admin.resumeCaseCreateHash";

/**
 * sessionStorage 键：从线索「签约并开始建档」弹窗跳转到客户档案后，用于回到线索并继续转案件。
 */
export const SESSION_KEY_RESUME_LEAD_CASE_CREATE =
  "gyosei.admin.resumeLeadCaseCreate";

/**
 * 「回到线索继续转案件」在 sessionStorage 中存储的结构体。
 */
export type LeadCaseCreateResumePayload = {
  /**
   *
   */
  leadId: string;
  /**
   *
   */
  customerId: string;
};

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

/**
 * 离开线索转案件弹窗前往客户详情前写入线索与客户 ID，供客户页展示「返回继续建档」横幅。
 *
 * @param payload - 线索 ID 与客户 ID
 */
export function persistLeadCaseCreateResume(
  payload: LeadCaseCreateResumePayload,
): void {
  try {
    sessionStorage.setItem(
      SESSION_KEY_RESUME_LEAD_CASE_CREATE,
      JSON.stringify(payload),
    );
  } catch {
    /* quota / private mode */
  }
}

/**
 * 读取待恢复的线索转案件上下文。
 *
 * @returns 有效 payload；无法解析时返回 null
 */
export function readLeadCaseCreateResume(): LeadCaseCreateResumePayload | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_RESUME_LEAD_CASE_CREATE);
    if (!raw?.trim()) return null;
    const p = JSON.parse(raw) as LeadCaseCreateResumePayload;
    const leadId = typeof p.leadId === "string" ? p.leadId.trim() : "";
    const customerId =
      typeof p.customerId === "string" ? p.customerId.trim() : "";
    if (!leadId || !customerId) return null;
    return { leadId, customerId };
  } catch {
    return null;
  }
}

/**
 * 清除线索转案件恢复数据。
 */
export function clearLeadCaseCreateResume(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY_RESUME_LEAD_CASE_CREATE);
  } catch {
    /* noop */
  }
}

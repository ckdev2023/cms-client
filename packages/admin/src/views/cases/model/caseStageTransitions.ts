/**
 * S1–S5 的前向默认下一阶段映射。
 * 与服务端 `DEFAULT_CASE_TRANSITIONS`（cases.service.write-helpers.ts）保持同步，
 * 取每个阶段邻接表的第一个正向边。
 */
export const CASE_STAGE_FORWARD_NEXT: Readonly<Record<string, string>> = {
  S1: "S2",
  S2: "S3",
  S3: "S4",
  S4: "S5",
  S5: "S6",
};

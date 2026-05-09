import { BadRequestException } from "@nestjs/common";

import { CASE_TYPE_LABELS_JA } from "../cases/caseTypeLabels.ja";

/**
 * 错误码：当 visaType 命中 CASE_TYPE_LABELS_JA 但 statusOfResidence
 * 与规范 ja-JP 标签不一致时抛出，便于上游做日志与监控对齐。
 */
export const INVALID_STATUS_OF_RESIDENCE_FOR_VISA =
  "INVALID_STATUS_OF_RESIDENCE_FOR_VISA";

/**
 * 校验 statusOfResidence 与 visaType 的规范映射；
 * 若 visaType 在 CASE_TYPE_LABELS_JA 中存在规范 ja-JP 标签，
 * statusOfResidence 必须与之完全一致（防止 typo 写入扩散到 reminders）。
 *
 * @param visaType - case_type_code（如 dependent_visa / business_manager_visa）。
 * @param statusOfResidence - 客户端提交的 ja-JP 在留资格标签。
 * @throws BadRequestException 当映射存在但标签不匹配时。
 */
export function assertStatusOfResidenceMatchesVisaType(
  visaType: string,
  statusOfResidence: string,
): void {
  const canonical = CASE_TYPE_LABELS_JA[visaType];
  if (canonical && canonical !== statusOfResidence) {
    throw new BadRequestException(
      `${INVALID_STATUS_OF_RESIDENCE_FOR_VISA}: visaType=${visaType} ` +
        `expects statusOfResidence=「${canonical}」, received=「${statusOfResidence}」`,
    );
  }
}

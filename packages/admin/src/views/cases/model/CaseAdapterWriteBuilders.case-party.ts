import type { CasePartyCreateInput } from "./CaseAdapterTypes";
import {
  normalizeNullableString,
  omitUndefined,
} from "./CaseAdapterWriteBuilders.shared";

/**
 * 构造 case-parties API 路径。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @returns case-parties 端点路径
 */
export function buildCasePartiesApiPath(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "/case-parties");
}

/**
 * 将案件关联人创建输入序列化为服务端 `POST /case-parties` 请求体。
 *
 * `caseId` 和 `partyType` 为必填；其余可选字段经归一化后发送。
 *
 * @param input - 案件关联人创建字段
 * @returns 可 JSON 序列化的请求体
 */
export function buildCreateCasePartyPayload(
  input: CasePartyCreateInput,
): Record<string, unknown> {
  return omitUndefined({
    caseId: input.caseId,
    partyType: input.partyType,
    customerId: normalizeNullableString(input.customerId),
    contactPersonId: normalizeNullableString(input.contactPersonId),
    relationToCase: normalizeNullableString(input.relationToCase),
    isPrimary: input.isPrimary,
  });
}

const ROLE_TO_PARTY_TYPE: Record<string, string> = {
  主申请人: "applicant",
  配偶: "family",
  子女: "family",
  扶养者: "supporter",
  保证人: "supporter",
};

function resolvePartyType(role: string): string {
  return ROLE_TO_PARTY_TYPE[role] ?? "applicant";
}

/**
 * 从主申请人信息构造 `CasePartyCreateInput`。
 *
 * @param caseId - 新建案件 ID
 * @param customerId - 主申请人客户 ID
 * @returns 主申请人关联人创建输入
 */
export function buildPrimaryCasePartyInput(
  caseId: string,
  customerId: string,
): CasePartyCreateInput {
  return {
    caseId,
    partyType: "applicant",
    customerId: customerId || undefined,
    isPrimary: true,
  };
}

/**
 * 从草稿关联人条目构造 `CasePartyCreateInput`。
 *
 * @param caseId - 新建案件 ID
 * @param party - 草稿中的关联人条目
 * @param party.customerId - 关联客户 ID
 * @param party.contactPersonId - 关联联系人 ID
 * @param party.role - 前端草稿中的角色标识
 * @param party.relation - 与案件/主申请人的关系文案
 * @returns 关联人创建输入
 */
export function buildRelatedCasePartyInput(
  caseId: string,
  party: {
    customerId?: string;
    contactPersonId?: string;
    role: string;
    relation?: string;
  },
): CasePartyCreateInput {
  const contactPersonId = party.contactPersonId || undefined;
  return {
    caseId,
    partyType: resolvePartyType(party.role),
    customerId: contactPersonId ? undefined : party.customerId || undefined,
    contactPersonId,
    relationToCase: party.relation || party.role || undefined,
    isPrimary: false,
  };
}

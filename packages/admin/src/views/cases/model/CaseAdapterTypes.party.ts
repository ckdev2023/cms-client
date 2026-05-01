/**
 * admin 侧 partyType 合法值联合类型（与 server VALID_PARTY_TYPES 对齐）。
 * 若 server 新增值，需同步更新此处并通过 contract test 校验一致性。
 */
export type PartyType =
  | "applicant"
  | "spouse"
  | "child"
  | "family"
  | "guarantor"
  | "representative"
  | "supporter"
  | "other";

export const ADMIN_VALID_PARTY_TYPES: ReadonlySet<PartyType> =
  new Set<PartyType>([
    "applicant",
    "spouse",
    "child",
    "family",
    "guarantor",
    "representative",
    "supporter",
    "other",
  ]);

/** POST /case-parties 创建输入。 */
export interface CasePartyCreateInput {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  partyType: PartyType;
  /**
   *
   */
  customerId?: string | null;
  /**
   *
   */
  contactPersonId?: string | null;
  /**
   *
   */
  relationToCase?: string | null;
  /**
   *
   */
  isPrimary?: boolean;
}

/**
 * 案件关联人 partyType 合法值联合类型。
 * admin buildPrimaryCasePartyInput → applicant；
 * admin resolvePartyType → family / supporter；
 * 其余为既有值。
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

export const VALID_PARTY_TYPES: ReadonlySet<string> = new Set<PartyType>([
  "applicant",
  "spouse",
  "child",
  "family",
  "guarantor",
  "representative",
  "supporter",
  "other",
]);

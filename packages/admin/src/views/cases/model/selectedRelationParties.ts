import type {
  CaseCreateSelectedRelation,
  CreateCaseRelatedParty,
} from "../types";

export const FAMILY_APPLICANT_ROLES = ["主申请人", "配偶", "子女"];
export const FAMILY_SUPPORTER_ROLES = ["扶养者", "保证人"];

const RELATION_TYPE_ROLE_MAP: Record<string, string> = {
  spouse: "配偶",
  child: "子女",
  agent: "保证人",
  parent: "扶养者",
  other: "扶养者",
};

const RELATION_TYPE_LABEL_MAP: Record<string, string> = {
  spouse: "配偶",
  parent: "父母",
  child: "子女",
  agent: "代理 / 顾问",
  other: "其他",
};

function joinContactParts(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" / ");
}

function resolveSelectedRelationRole(
  relation: CaseCreateSelectedRelation,
): string {
  const normalizedRoleTitle = relation.roleTitle?.trim();
  const normalizedTags = (relation.tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean);
  const taggedRole = normalizedTags.find((tag) =>
    [...FAMILY_APPLICANT_ROLES, ...FAMILY_SUPPORTER_ROLES].includes(tag),
  );

  if (taggedRole) return taggedRole;
  if (
    normalizedRoleTitle &&
    [...FAMILY_APPLICANT_ROLES, ...FAMILY_SUPPORTER_ROLES].includes(
      normalizedRoleTitle,
    )
  ) {
    return normalizedRoleTitle;
  }

  return RELATION_TYPE_ROLE_MAP[relation.relationType] ?? "扶养者";
}

function resolveRelationLabel(relation: CaseCreateSelectedRelation): string {
  return (
    relation.roleTitle?.trim() ||
    relation.tags?.find((tag) => tag.trim())?.trim() ||
    RELATION_TYPE_LABEL_MAP[relation.relationType] ||
    relation.relationType
  );
}

function mapRelationTarget(
  relation: CaseCreateSelectedRelation,
  key: string,
): Pick<CreateCaseRelatedParty, "customerId" | "contactPersonId"> {
  if (relation.kind === "contact_person") {
    return { contactPersonId: key };
  }
  return { customerId: key };
}

interface MapSelectedRelationsToPartiesInput {
  /** 候选关系人列表。 */
  relations: readonly CaseCreateSelectedRelation[];
  /** 批量建案继承的组别值。 */
  group: string;
  /** 组别显示标签。 */
  groupLabel: string;
}

/**
 * 将客户关系人映射为家族批量建案的附加当事人。
 *
 * @param input - 关系人与组别上下文
 * @returns 可直接写入建案草稿的附加当事人列表
 */
export function mapSelectedRelationsToParties(
  input: MapSelectedRelationsToPartiesInput,
): CreateCaseRelatedParty[] {
  const parties: CreateCaseRelatedParty[] = [];
  const seen = new Set<string>();

  for (const relation of input.relations) {
    const key = relation.id.trim();
    const name = relation.name.trim();
    if (!key || !name || seen.has(key)) continue;

    seen.add(key);
    parties.push({
      ...mapRelationTarget(relation, key),
      name,
      role: resolveSelectedRelationRole(relation),
      relation: resolveRelationLabel(relation),
      contact: joinContactParts([relation.phone, relation.email]),
      note: relation.note?.trim() || relation.roleTitle?.trim() || "",
      group: input.group,
      groupLabel: input.groupLabel,
    });
  }

  if (
    parties.length > 0 &&
    parties.every((p) => !FAMILY_APPLICANT_ROLES.includes(p.role))
  ) {
    const first = parties[0];
    parties[0] = {
      ...first,
      role: "配偶",
    };
  }

  return parties;
}

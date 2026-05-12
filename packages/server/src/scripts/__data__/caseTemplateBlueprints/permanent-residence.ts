import type { RequirementBlueprintItem } from "../../../modules/core/cases/cases.types-template-blueprints";

export const PERMANENT_RESIDENCE_REQUIREMENT_BLUEPRINT: RequirementBlueprintItem[] =
  [
    {
      checklistItemCode: "pr-passport",
      name: "パスポート（旅券）",
      category: "personal",
      requiredFlag: true,
      ownerSide: "applicant",
      providedByRole: "applicant",
      sortOrder: 1,
    },
    {
      checklistItemCode: "pr-residence-card",
      name: "在留カード（表・裏）",
      category: "personal",
      requiredFlag: true,
      ownerSide: "applicant",
      providedByRole: "applicant",
      sortOrder: 2,
    },
    {
      checklistItemCode: "pr-tax-cert",
      name: "納税証明書（その３・その５ など）",
      category: "personal",
      requiredFlag: true,
      ownerSide: "applicant",
      providedByRole: "applicant",
      sortOrder: 3,
    },
    {
      checklistItemCode: "pr-residence-cert",
      name: "住民票（世帯・個人）",
      category: "personal",
      requiredFlag: true,
      ownerSide: "applicant",
      providedByRole: "applicant",
      sortOrder: 4,
    },
    {
      checklistItemCode: "pr-photo",
      name: "証明写真（4cm×3cm）",
      category: "personal",
      requiredFlag: true,
      ownerSide: "applicant",
      providedByRole: "applicant",
      sortOrder: 5,
    },
  ];

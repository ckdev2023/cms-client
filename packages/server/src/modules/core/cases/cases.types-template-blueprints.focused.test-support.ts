export const VALID_STEP = {
  stepCode: "STEP_A",
  label: "Step A",
  parentStage: "S3",
  sortOrder: 1,
  canLoopTo: null,
  billingGate: null,
};

export const VALID_FIELD = {
  fieldKey: "visaPlan",
  label: "ビザプラン",
  fieldType: "enum",
  required: true,
  defaultValue: null,
  enumValues: ["1year", "3years"],
};

export const VALID_REQ = {
  checklistItemCode: "bmv-questionnaire",
  name: "経営管理ビザ情報表",
  category: "questionnaire",
  requiredFlag: true,
  ownerSide: "customer",
  providedByRole: "supporter",
  sortOrder: 1,
};

export const VALID_REMINDER = {
  daysBefore: 90,
  channel: "in_app",
  recipientType: "owner",
  label: "在留到期前90天提醒",
};

export const SAMPLE_STEPS = [
  { ...VALID_STEP },
  { ...VALID_STEP, stepCode: "STEP_B", label: "Step B", sortOrder: 2 },
];

export const SAMPLE_FIELDS = [
  { ...VALID_FIELD },
  {
    fieldKey: "coeIssuedDate",
    label: "COE交付日",
    fieldType: "date",
    required: false,
    defaultValue: null,
  },
];

export const SAMPLE_REQS = [
  { ...VALID_REQ },
  {
    ...VALID_REQ,
    checklistItemCode: "bmv-passport-copy",
    name: "パスポートコピー",
    category: "personal",
    ownerSide: "applicant",
    sortOrder: 2,
  },
];

export const SAMPLE_REMINDERS = [
  { ...VALID_REMINDER },
  {
    daysBefore: 30,
    channel: "in_app",
    recipientType: "owner",
    label: "在留到期前30天提醒",
  },
];

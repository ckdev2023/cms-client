type OrganizationId = string;
type UserId = string;
type CustomerId = string;
type CompanyId = string;
type ContactPersonId = string;
type CaseId = string;
type CasePartyId = string;
type DocumentItemId = string;
type TimelineLogId = string;

type OrganizationPlan = string;
type OrganizationStatus = string;

type UserStatus = string;

type CustomerType = string;

type CaseStatus = string;

type DocumentItemStatus = string;
type DocumentItemOwnerSide = string;

type ReminderStatus = string;
type ReminderEntityType = string;

/**
 * Timeline 记录所指向的实体类型（核心对象）。
 */
export type TimelineEntityType =
  | "organization"
  | "user"
  | "customer"
  | "case"
  | "document_item"
  | "reminder"
  | "company"
  | "contact_person"
  | "case_party"
  | "document_file"
  | "communication_log"
  | "task"
  | "generated_document"
  | "billing_record"
  | "payment_record";

/**
 * Timeline 动作标识。
 */
export type TimelineAction = string;

/**
 * Organization 核心对象（租户/事务所）。
 */
export type Organization = {
  id: OrganizationId;
  name: string;
  plan: OrganizationPlan;
  settings: Record<string, unknown>;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * User 核心对象（用户）。
 */
export type User = {
  id: UserId;
  orgId: OrganizationId;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * Customer 核心对象（客户主档）。
 */
export type Customer = {
  id: CustomerId;
  orgId: OrganizationId;
  type: CustomerType;
  baseProfile: Record<string, unknown>;
  contacts: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Case 核心对象（案件实例，强制与 Customer 分离）。
 */
export type Case = {
  id: CaseId;
  orgId: OrganizationId;
  customerId: CustomerId;
  caseTypeCode: string;
  status: CaseStatus;
  ownerUserId: UserId;
  openedAt: string;
  dueAt: string | null;
  metadata: Record<string, unknown>;
  caseNo: string | null;
  caseName: string | null;
  caseSubtype: string | null;
  applicationType: string | null;
  companyId: CompanyId | null;
  priority: string;
  riskLevel: string;
  assistantUserId: UserId | null;
  sourceChannel: string | null;
  signedAt: string | null;
  acceptedAt: string | null;
  submissionDate: string | null;
  resultDate: string | null;
  residenceExpiryDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * DocumentItem 核心对象（案件下的结构化资料项）。
 */
export type DocumentItem = {
  id: DocumentItemId;
  orgId: OrganizationId;
  caseId: CaseId;
  checklistItemCode: string;
  name: string;
  status: DocumentItemStatus;
  requestedAt: string | null;
  receivedAt: string | null;
  reviewedAt: string | null;
  dueAt: string | null;
  ownerSide: DocumentItemOwnerSide;
  lastFollowUpAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * CaseParty 核心对象（案件关联人）。
 */
export type CaseParty = {
  id: CasePartyId;
  orgId: OrganizationId;
  caseId: CaseId;
  partyType: string;
  customerId: CustomerId | null;
  contactPersonId: ContactPersonId | null;
  relationToCase: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Company 核心对象（企业客户）。
 */
export type Company = {
  id: CompanyId;
  orgId: OrganizationId;
  companyNo: string | null;
  companyName: string;
  corporateNumber: string | null;
  establishedDate: string | null;
  capitalAmount: number | null;
  address: string | null;
  businessScope: string | null;
  employeeCount: number | null;
  fiscalYearEnd: string | null;
  website: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  ownerUserId: UserId | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * ContactPerson 核心对象（联系人/关联人）。
 */
export type ContactPerson = {
  id: ContactPersonId;
  orgId: OrganizationId;
  companyId: CompanyId | null;
  customerId: CustomerId | null;
  name: string;
  roleTitle: string | null;
  relationType: string | null;
  phone: string | null;
  email: string | null;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Reminder 核心对象（提醒/到期通知）。
 */
export type Reminder = {
  id: string;
  orgId: OrganizationId;
  entityType: ReminderEntityType;
  entityId: string;
  scheduledAt: string;
  status: ReminderStatus;
  payload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * TimelineLog 核心对象（统一审计/时间线）。
 */
export type TimelineLog = {
  id: TimelineLogId;
  orgId: OrganizationId;
  entityType: TimelineEntityType;
  entityId: string;
  action: TimelineAction;
  actorUserId: UserId | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

const TIMELINE_ENTITY_TYPES: ReadonlySet<string> = new Set<string>([
  "organization",
  "user",
  "customer",
  "case",
  "document_item",
  "reminder",
  "company",
  "contact_person",
  "case_party",
  "document_file",
  "communication_log",
  "task",
  "generated_document",
  "billing_record",
  "payment_record",
]);

/**
 * 判断输入是否为 TimelineEntityType。
 *
 * @param value 待判断值
 * @returns 是否为 TimelineEntityType
 */
export function isTimelineEntityType(
  value: unknown,
): value is TimelineEntityType {
  return typeof value === "string" && TIMELINE_ENTITY_TYPES.has(value);
}

/* eslint-disable max-lines */

import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema 入口。
 *
 * 该文件用于为现有 PostgreSQL 表提供类型化定义与关联关系，方便逐步引入
 * Drizzle 查询能力。当前仓库仍以 `src/infra/db/migrations` 下的 SQL migration
 * 作为数据库结构的真实来源，因此这里的定义需要与 migration 保持同步。
 */

/**
 * `organizations` 表定义。
 *
 * 用途：
 * - 表示租户/事务所主体
 * - 作为大部分业务表的 `org_id` 外键源
 * - 为 RLS 与多租户隔离提供根对象
 *
 * @returns organizations 表的 Drizzle schema
 */
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"),
  settings: jsonb("settings")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `users` 表定义。
 *
 * 用途：
 * - 表示组织内的后台用户
 * - 作为案件负责人、企业负责人、沟通记录创建人等实体的引用目标
 * - 与 `organizations` 形成多对一关系
 *
 * @returns users 表的 Drizzle schema
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  createdBy: uuid("created_by"),
  disabledAt: timestamp("disabled_at", { withTimezone: true, mode: "string" }),
  passwordSetAt: timestamp("password_set_at", {
    withTimezone: true,
    mode: "string",
  }),
  roleId: uuid("role_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `roles` 表定义。
 *
 * 用途：
 * - 表示 RBAC 角色定义（system 内建 + 自定义角色）
 * - 为 `users.role_id` 与 `role_permissions` 提供外键源
 */
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_roles_org").on(table.orgId)],
);

/**
 * `role_permissions` 表定义。
 *
 * 用途：
 * - 记录角色与权限码的关联
 */
export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
});

/**
 * `user_permission_overrides` 表定义。
 *
 * 用途：
 * - 记录用户级权限覆盖（grant/deny）
 * - 支持审计追踪与过期自动回收
 */
export const userPermissionOverrides = pgTable("user_permission_overrides", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  effect: text("effect").notNull(),
  reason: text("reason"),
  grantedBy: uuid("granted_by")
    .notNull()
    .references(() => users.id),
  grantedAt: timestamp("granted_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
});

/**
 * `customers` 表定义。
 *
 * 用途：
 * - 表示客户主档
 * - 承载基础档案与联系方式的 JSON 结构
 * - 作为 `cases` 与部分沟通记录的关联目标
 *
 * @returns customers 表的 Drizzle schema
 */
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  type: text("type").notNull(),
  baseProfile: jsonb("base_profile")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  contacts: jsonb("contacts")
    .$type<Record<string, unknown>[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `companies` 表定义。
 *
 * 用途：
 * - 表示企业客户主档
 * - 承载法人信息、联系方式与企业负责人关联
 * - 作为工作类案件与沟通记录的可选关联目标
 *
 * @returns companies 表的 Drizzle schema
 */
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  companyNo: text("company_no"),
  companyName: text("company_name").notNull(),
  corporateNumber: text("corporate_number"),
  establishedDate: date("established_date", { mode: "string" }),
  capitalAmount: numeric("capital_amount", { precision: 15, scale: 2 }),
  address: text("address"),
  businessScope: text("business_scope"),
  employeeCount: integer("employee_count"),
  fiscalYearEnd: text("fiscal_year_end"),
  website: text("website"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `contact_persons` 表定义。
 *
 * 用途：
 * - 表示企业或客户下的联系人档案
 * - 作为 `case_parties.contact_person_id` 的真实来源
 *
 * @returns contact_persons 表的 Drizzle schema
 */
export const contactPersons = pgTable(
  "contact_persons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    companyId: uuid("company_id").references(() => companies.id),
    customerId: uuid("customer_id").references(() => customers.id),
    name: text("name").notNull(),
    roleTitle: text("role_title"),
    relationType: text("relation_type"),
    phone: text("phone"),
    email: text("email"),
    preferredLanguage: text("preferred_language").notNull().default("ja"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_contact_persons_org_id").on(table.orgId),
    index("idx_contact_persons_company_id").on(table.companyId),
    index("idx_contact_persons_customer_id").on(table.customerId),
  ],
);

/**
 * `groups` 表定义。
 *
 * 用途：
 * - 表示事务所内的业务分组
 * - 作为 `cases.group_id` / `user_group_memberships.group_id` 的真实来源
 * - 承载单层 Group 治理（创建/停用/重命名）
 *
 * @returns groups 表的 Drizzle schema
 */
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    groupNo: text("group_no"),
    name: text("name").notNull(),
    description: text("description"),
    activeFlag: boolean("active_flag").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_groups_org").on(table.orgId),
    index("idx_groups_created_by").on(table.createdBy),
    index("idx_groups_updated_by").on(table.updatedBy),
  ],
);

/**
 * `user_group_memberships` 表定义。
 *
 * 用途：
 * - 记录用户与 Group 的归属关系
 * - `is_primary_group` 标识用户的主 Group（决定默认继承与权限判断）
 *
 * @returns user_group_memberships 表的 Drizzle schema
 */
export const userGroupMemberships = pgTable(
  "user_group_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    isPrimaryGroup: boolean("is_primary_group").notNull().default(false),
    activeFlag: boolean("active_flag").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_ugm_user").on(table.userId),
    index("idx_ugm_group").on(table.groupId),
  ],
);

/**
 * `cases` 表定义。
 *
 * 用途：
 * - 表示案件主对象，是业务流程的核心实体
 * - 关联客户、企业、负责人等关键对象
 * - 承载案件状态、优先级、风险等级以及关键时间字段
 *
 * 说明：
 * - 该定义对齐 `001_init.sql`、`009_core_entities.up.sql`、`014_case_truth.up.sql` 与 `022_groups_and_case_group.up.sql`
 * - 业务流程上的阶段/门槛由上层服务与文档定义，不在 schema 中编码
 *
 * @returns cases 表的 Drizzle schema
 */
export const cases = pgTable("cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  caseTypeCode: text("case_type_code").notNull(),
  status: text("status").notNull(),
  stage: text("stage"),
  groupId: uuid("group_id").references(() => groups.id),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  caseNo: text("case_no"),
  caseName: text("case_name"),
  caseSubtype: text("case_subtype"),
  applicationType: text("application_type"),
  applicationFlowType: text("application_flow_type")
    .notNull()
    .default("standard"),
  visaPlan: text("visa_plan"),
  postApprovalStage: text("post_approval_stage").notNull().default("none"),
  coeIssuedAt: timestamp("coe_issued_at", {
    withTimezone: true,
    mode: "string",
  }),
  coeExpiryDate: date("coe_expiry_date", { mode: "string" }),
  coeSentAt: timestamp("coe_sent_at", { withTimezone: true, mode: "string" }),
  closeReason: text("close_reason"),
  supplementCount: integer("supplement_count").notNull().default(0),
  companyId: uuid("company_id").references(() => companies.id),
  priority: text("priority").notNull().default("normal"),
  riskLevel: text("risk_level").notNull().default("low"),
  assistantUserId: uuid("assistant_user_id").references(() => users.id),
  sourceChannel: text("source_channel"),
  signedAt: timestamp("signed_at", { withTimezone: true, mode: "string" }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
  submissionDate: date("submission_date", { mode: "string" }),
  resultDate: date("result_date", { mode: "string" }),
  residenceExpiryDate: date("residence_expiry_date", { mode: "string" }),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  resultOutcome: text("result_outcome"),
  quotePrice: numeric("quote_price", { precision: 15, scale: 2 }),
  depositPaidCached: boolean("deposit_paid_cached").notNull().default(false),
  finalPaymentPaidCached: boolean("final_payment_paid_cached")
    .notNull()
    .default(false),
  billingUnpaidAmountCached: numeric("billing_unpaid_amount_cached", {
    precision: 15,
    scale: 2,
  })
    .notNull()
    .default("0"),
  billingRiskAcknowledgedBy: uuid("billing_risk_acknowledged_by").references(
    () => users.id,
  ),
  billingRiskAcknowledgedAt: timestamp("billing_risk_acknowledged_at", {
    withTimezone: true,
    mode: "string",
  }),
  billingRiskAckReasonCode: text("billing_risk_ack_reason_code"),
  billingRiskAckReasonNote: text("billing_risk_ack_reason_note"),
  billingRiskAckEvidenceUrl: text("billing_risk_ack_evidence_url"),
  overseasVisaStartAt: timestamp("overseas_visa_start_at", {
    withTimezone: true,
    mode: "string",
  }),
  entryConfirmedAt: timestamp("entry_confirmed_at", {
    withTimezone: true,
    mode: "string",
  }),
  businessPhase: text("business_phase").notNull(),
  currentWorkflowStepCode: text("current_workflow_step_code"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `communication_logs` 表定义。
 *
 * 用途：
 * - 记录案件/客户/企业维度的沟通留痕
 * - 支持客户可见标识、跟进要求与跟进到期时间
 * - 作为时间线与后续提醒能力的重要输入之一
 *
 * 说明：
 * - `case_id`、`customer_id`、`company_id` 在数据库层都允许为空
 * - “至少关联一个对象”的业务规则由 service 层校验，不在 schema 层表达
 *
 * @returns communication_logs 表的 Drizzle schema
 */
export const communicationLogs = pgTable("communication_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  caseId: uuid("case_id").references(() => cases.id),
  customerId: uuid("customer_id").references(() => customers.id),
  companyId: uuid("company_id").references(() => companies.id),
  channelType: text("channel_type").notNull(),
  direction: text("direction").notNull().default("inbound"),
  subject: text("subject"),
  contentSummary: text("content_summary"),
  fullContent: text("full_content"),
  visibleToClient: boolean("visible_to_client").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDueAt: timestamp("follow_up_due_at", {
    withTimezone: true,
    mode: "string",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `case_stage_history` 表定义。
 *
 * 用途：
 * - 记录案件每次 S1–S9 阶段流转，用于审计与回溯
 * - 由 015_case_stage_history migration 创建（含 RLS）
 *
 * @returns case_stage_history 表的 Drizzle schema
 */
export const caseStageHistory = pgTable("case_stage_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id),
  fromStage: text("from_stage").notNull(),
  toStage: text("to_stage").notNull(),
  reason: text("reason"),
  changedBy: uuid("changed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * `case_parties` 表定义。
 *
 * 用途：
 * - 表示案件参与方（主申请人、家属、企业联系人等）
 * - 为 Gate-A 的主申请人校验提供真值
 *
 * @returns case_parties 表的 Drizzle schema
 */
export const caseParties = pgTable(
  "case_parties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    partyType: text("party_type").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    contactPersonId: uuid("contact_person_id").references(
      () => contactPersons.id,
    ),
    relationToCase: text("relation_to_case"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_case_parties_org_id").on(table.orgId),
    index("idx_case_parties_case_id").on(table.caseId),
    index("idx_case_parties_customer_id").on(table.customerId),
    index("idx_case_parties_contact_person_id").on(table.contactPersonId),
  ],
);

/**
 * `document_items` 表定义。
 *
 * 用途：
 * - 表示案件资料清单项
 * - 为 Gate-A / Gate-B 的资料完备校验提供真值
 *
 * @returns document_items 表的 Drizzle schema
 */
export const documentItems = pgTable(
  "document_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    checklistItemCode: text("checklist_item_code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "string",
    }),
    receivedAt: timestamp("received_at", {
      withTimezone: true,
      mode: "string",
    }),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
    ownerSide: text("owner_side").notNull().default("customer"),
    lastFollowUpAt: timestamp("last_follow_up_at", {
      withTimezone: true,
      mode: "string",
    }),
    note: text("note"),
    category: text("category"),
    providedByRole: text("provided_by_role"),
    requiredFlag: boolean("required_flag").notNull().default(true),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id),
    clientVisibleFlag: boolean("client_visible_flag").notNull().default(false),
    clientActionRequired: boolean("client_action_required")
      .notNull()
      .default(false),
    latestVersionId: uuid("latest_version_id"),
    reviewCommentLatest: text("review_comment_latest"),
    waiveReasonLatest: text("waive_reason_latest"),
    waiveReasonCodeLatest: text("waive_reason_code_latest"),
    waivedByUserIdLatest: uuid("waived_by_user_id_latest").references(
      () => users.id,
    ),
    waivedAtLatest: timestamp("waived_at_latest", {
      withTimezone: true,
      mode: "string",
    }),
    surveyData: jsonb("survey_data").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_document_items_org_id").on(table.orgId),
    index("idx_document_items_case_id").on(table.caseId),
    index("idx_document_items_assignee_user_id").on(table.assigneeUserId),
    index("idx_document_items_waived_by_user_id_latest").on(
      table.waivedByUserIdLatest,
    ),
    index("idx_document_items_category").on(table.caseId, table.category),
  ],
);

/**
 * `case_templates` 表定义。
 *
 * 用途：
 * - 预置案件模板（P0：家族滞在、技人国；P1：经营管理签）
 * - 驱动资料清单生成、校验规则、默认任务与业务子步骤蓝图
 * - 三个 blueprint 字段（workflow_steps / extra_fields / reminder_schedule）
 *   P0 为 null（降级运行），P1 经营管理签模板填充后启用
 *
 * @returns case_templates 表的 Drizzle schema
 */
export const caseTemplates = pgTable(
  "case_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    templateName: text("template_name").notNull(),
    caseType: text("case_type").notNull(),
    applicationType: text("application_type"),
    requirementBlueprint: jsonb("requirement_blueprint").$type<
      Record<string, unknown>[] | null
    >(),
    defaultTasksBlueprint: jsonb("default_tasks_blueprint").$type<Record<
      string,
      unknown
    > | null>(),
    validationRulesetRef: jsonb("validation_ruleset_ref").$type<Record<
      string,
      unknown
    > | null>(),
    reviewRequiredFlag: boolean("review_required_flag")
      .notNull()
      .default(false),
    billingGateMode: text("billing_gate_mode").notNull().default("warn"),
    workflowStepsBlueprint: jsonb("workflow_steps_blueprint").$type<
      Record<string, unknown>[] | null
    >(),
    extraFieldsSchema: jsonb("extra_fields_schema").$type<
      Record<string, unknown>[] | null
    >(),
    reminderScheduleBlueprint: jsonb(
      "reminder_schedule_blueprint",
    ).$type<Record<string, unknown> | null>(),
    activeFlag: boolean("active_flag").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_case_templates_org").on(table.orgId),
    index("idx_case_templates_case_type").on(table.orgId, table.caseType),
  ],
);

/**
 * `residence_periods` 表定义。
 *
 * 用途：
 * - 记录客户在案件内的在留资格、许可期间与当前有效卡信息
 * - 为续签提醒、到期风险判断与结果页展示提供真值来源
 *
 * @returns residence_periods 表的 Drizzle schema
 */
export const residencePeriods = pgTable(
  "residence_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    visaType: text("visa_type").notNull(),
    statusOfResidence: text("status_of_residence").notNull(),
    periodYears: integer("period_years"),
    periodLabel: text("period_label"),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validUntil: date("valid_until", { mode: "string" }).notNull(),
    cardNumber: text("card_number"),
    isCurrent: boolean("is_current").notNull().default(false),
    entryDate: date("entry_date", { mode: "string" }),
    reminderCreated: boolean("reminder_created").notNull().default(false),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_residence_periods_org").on(table.orgId),
    index("idx_residence_periods_case").on(table.caseId),
    index("idx_residence_periods_customer").on(table.customerId),
    index("idx_residence_periods_created_by").on(table.createdBy),
  ],
);

/**
 * `document_assets` 表定义。
 *
 * 用途：
 * - 表示可跨案件复用的逻辑资料资产
 * - 作为 document_files 的 asset_id 真实来源
 *
 * @returns document_assets 表的 Drizzle schema
 */
export const documentAssets = pgTable(
  "document_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    materialCode: text("material_code").notNull(),
    ownerSubjectType: text("owner_subject_type").notNull().default("customer"),
    ownerCustomerId: uuid("owner_customer_id").references(() => customers.id),
    ownerEmployerIdentityKey: text("owner_employer_identity_key"),
    originCaseId: uuid("origin_case_id").references(() => cases.id),
    sourceRequirementId: uuid("source_requirement_id"),
    activeFlag: boolean("active_flag").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_document_assets_org_id").on(table.orgId),
    index("idx_document_assets_owner_customer_id").on(table.ownerCustomerId),
    index("idx_document_assets_origin_case_id").on(table.originCaseId),
    uniqueIndex("idx_document_assets_unique_customer_owned")
      .on(
        table.orgId,
        table.materialCode,
        table.ownerSubjectType,
        table.ownerCustomerId,
      )
      .where(
        sql`${table.activeFlag} = true AND ${table.ownerCustomerId} IS NOT NULL`,
      ),
    uniqueIndex("idx_document_assets_unique_employer_owned")
      .on(table.orgId, table.materialCode, table.ownerEmployerIdentityKey)
      .where(
        sql`${table.activeFlag} = true AND ${table.ownerEmployerIdentityKey} IS NOT NULL`,
      ),
  ],
);

/**
 * `document_files` 表定义。
 *
 * 用途：
 * - 表示资料项下的具体文件版本
 * - 与 submission package 的锁定引用一一对应
 *
 * @returns document_files 表的 Drizzle schema
 */
export const documentFiles = pgTable(
  "document_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => documentItems.id),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url"),
    fileType: text("file_type"),
    fileSize: bigint("file_size", { mode: "number" }),
    versionNo: integer("version_no").notNull().default(1),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    reviewStatus: text("review_status").notNull().default("pending"),
    reviewBy: uuid("review_by").references(() => users.id),
    reviewAt: timestamp("review_at", { withTimezone: true, mode: "string" }),
    expiryDate: date("expiry_date", { mode: "string" }),
    hashValue: text("hash_value"),
    assetId: uuid("asset_id").references(() => documentAssets.id),
    storageType: text("storage_type").notNull().default("local_server"),
    relativePath: text("relative_path"),
    capturedByType: text("captured_by_type").notNull().default("internal_user"),
    capturedById: uuid("captured_by_id"),
    capturedAt: timestamp("captured_at", {
      withTimezone: true,
      mode: "string",
    }),
    visibleScope: text("visible_scope").notNull().default("internal_only"),
    reviewComment: text("review_comment"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_document_files_org_id").on(table.orgId),
    index("idx_document_files_requirement_id").on(table.requirementId),
    index("idx_document_files_uploaded_by").on(table.uploadedBy),
    index("idx_document_files_review_by").on(table.reviewBy),
    index("idx_document_files_asset_id").on(table.assetId),
  ],
);

/**
 * `generated_documents` 表定义。
 *
 * 用途：
 * - 表示案件中生成的申请文书版本
 * - 为 Gate-B 与 submission package 提供文书真值
 *
 * @returns generated_documents 表的 Drizzle schema
 */
export const generatedDocuments = pgTable(
  "generated_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    templateId: uuid("template_id"),
    title: text("title").notNull(),
    versionNo: integer("version_no").notNull().default(1),
    outputFormat: text("output_format").notNull().default("pdf"),
    fileUrl: text("file_url"),
    status: text("status").notNull().default("draft"),
    generatedBy: uuid("generated_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    generatedAt: timestamp("generated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("idx_generated_documents_org_id").on(table.orgId),
    index("idx_generated_documents_case_id").on(table.caseId),
    index("idx_generated_documents_generated_by").on(table.generatedBy),
    index("idx_generated_documents_approved_by").on(table.approvedBy),
  ],
);

/**
 * `document_requirement_file_refs` 表定义。
 *
 * 用途：
 * - 记录资料项与文件版本的锁定引用关系
 * - 区分直接登记与复用来源
 *
 * @returns document_requirement_file_refs 表的 Drizzle schema
 */
export const documentRequirementFileRefs = pgTable(
  "document_requirement_file_refs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => documentItems.id),
    fileVersionId: uuid("file_version_id")
      .notNull()
      .references(() => documentFiles.id),
    refMode: text("ref_mode").notNull().default("direct_register"),
    linkedFromRequirementId: uuid("linked_from_requirement_id").references(
      () => documentItems.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_doc_req_file_refs_requirement").on(table.requirementId),
    index("idx_doc_req_file_refs_file_version").on(table.fileVersionId),
    index("idx_doc_req_file_refs_linked_from_requirement").on(
      table.linkedFromRequirementId,
    ),
    index("idx_doc_req_file_refs_created_by").on(table.createdBy),
  ],
);

export const validationRuns = pgTable(
  "validation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    rulesetRef: jsonb("ruleset_ref").$type<Record<string, unknown>>(),
    resultStatus: text("result_status").notNull().default("pending"),
    blockingCount: integer("blocking_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    reportPayload: jsonb("report_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    executedBy: uuid("executed_by").references(() => users.id),
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_validation_runs_org_id").on(table.orgId),
    index("idx_validation_runs_case_id").on(table.caseId),
    index("idx_validation_runs_executed_by").on(table.executedBy),
  ],
);

export const reviewRecords = pgTable(
  "review_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    validationRunId: uuid("validation_run_id")
      .notNull()
      .references(() => validationRuns.id),
    decision: text("decision").notNull(),
    comment: text("comment"),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_review_records_org_id").on(table.orgId),
    index("idx_review_records_case_id").on(table.caseId),
    index("idx_review_records_validation_run_id").on(table.validationRunId),
    index("idx_review_records_reviewer_user_id").on(table.reviewerUserId),
  ],
);

/**
 * `submission_packages` 表定义。
 *
 * 用途：
 * - 表示一次正式提交/补正时刻的不可变包
 * - 作为锁定资料与生成文书版本的聚合根
 *
 * @returns submission_packages 表的 Drizzle schema
 */
export const submissionPackages = pgTable(
  "submission_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    submissionNo: integer("submission_no").notNull(),
    submissionKind: text("submission_kind").notNull().default("initial"),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    validationRunId: uuid("validation_run_id").references(
      (): AnyPgColumn => validationRuns.id,
    ),
    reviewRecordId: uuid("review_record_id").references(
      (): AnyPgColumn => reviewRecords.id,
    ),
    authorityName: text("authority_name"),
    acceptanceNo: text("acceptance_no"),
    receiptStorageType: text("receipt_storage_type"),
    receiptRelativePathOrKey: text("receipt_relative_path_or_key"),
    relatedSubmissionId: uuid("related_submission_id").references(
      (): AnyPgColumn => submissionPackages.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_submission_packages_org_id").on(table.orgId),
    index("idx_submission_packages_case_id").on(table.caseId),
    index("idx_submission_packages_validation_run_id").on(
      table.validationRunId,
    ),
    index("idx_submission_packages_review_record_id").on(table.reviewRecordId),
    index("idx_submission_packages_related_submission_id").on(
      table.relatedSubmissionId,
    ),
    index("idx_submission_packages_created_by").on(table.createdBy),
  ],
);

/**
 * `submission_package_items` 表定义。
 *
 * 用途：
 * - 记录提交包中被锁定的资料项、资料版本、文书版本或字段快照
 * - 提供“提交时冻结”的最小事实来源
 *
 * @returns submission_package_items 表的 Drizzle schema
 */
export const submissionPackageItems = pgTable(
  "submission_package_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionPackageId: uuid("submission_package_id")
      .notNull()
      .references((): AnyPgColumn => submissionPackages.id),
    itemType: text("item_type").notNull(),
    refId: uuid("ref_id").notNull(),
    snapshotPayload: jsonb("snapshot_payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_submission_package_items_pkg").on(table.submissionPackageId),
  ],
);

/**
 * `organizations` 的关联关系定义。
 *
 * 用途：
 * - 统一声明组织与用户、客户、企业、案件、沟通记录之间的一对多关系
 * - 为后续基于组织维度的预加载与联表查询提供类型信息
 *
 * @returns organizations 相关 relations
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  companies: many(companies),
  groups: many(groups),
  cases: many(cases),
  caseTemplates: many(caseTemplates),
  communicationLogs: many(communicationLogs),
  caseStageHistory: many(caseStageHistory),
}));

/**
 * `users` 的关联关系定义。
 *
 * 用途：
 * - 描述用户所属组织
 * - 描述用户与企业负责人、案件负责人/协作者、沟通记录创建人的关系
 *
 * @returns users 相关 relations
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  assignedRole: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  ownedCompanies: many(companies),
  ownedCases: many(cases, { relationName: "case_owner" }),
  assistedCases: many(cases, { relationName: "case_assistant" }),
  billingRiskAckedCases: many(cases, { relationName: "case_billing_risk_ack" }),
  createdCommunicationLogs: many(communicationLogs),
  changedStageHistory: many(caseStageHistory),
  groupMemberships: many(userGroupMemberships),
  permissionOverrides: many(userPermissionOverrides),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.orgId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [roles.createdBy],
    references: [users.id],
  }),
  permissions: many(rolePermissions),
  users: many(users),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
  }),
);

export const userPermissionOverridesRelations = relations(
  userPermissionOverrides,
  ({ one }) => ({
    user: one(users, {
      fields: [userPermissionOverrides.userId],
      references: [users.id],
    }),
    grantor: one(users, {
      fields: [userPermissionOverrides.grantedBy],
      references: [users.id],
      relationName: "override_grantor",
    }),
  }),
);

/**
 * `groups` 的关联关系定义。
 *
 * @returns groups 相关 relations
 */
export const groupsRelations = relations(groups, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [groups.orgId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
    relationName: "group_creator",
  }),
  updater: one(users, {
    fields: [groups.updatedBy],
    references: [users.id],
    relationName: "group_updater",
  }),
  memberships: many(userGroupMemberships),
  cases: many(cases),
}));

/**
 * `user_group_memberships` 的关联关系定义。
 *
 * @returns user_group_memberships 相关 relations
 */
export const userGroupMembershipsRelations = relations(
  userGroupMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [userGroupMemberships.userId],
      references: [users.id],
    }),
    group: one(groups, {
      fields: [userGroupMemberships.groupId],
      references: [groups.id],
    }),
  }),
);

/**
 * `customers` 的关联关系定义。
 *
 * 用途：
 * - 描述客户所属组织
 * - 描述客户与案件、沟通记录之间的主从关系
 *
 * @returns customers 相关 relations
 */
export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.orgId],
    references: [organizations.id],
  }),
  cases: many(cases),
  communicationLogs: many(communicationLogs),
}));

/**
 * `companies` 的关联关系定义。
 *
 * 用途：
 * - 描述企业所属组织与负责人
 * - 描述企业与案件、沟通记录之间的引用关系
 *
 * @returns companies 相关 relations
 */
export const companiesRelations = relations(companies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [companies.orgId],
    references: [organizations.id],
  }),
  ownerUser: one(users, {
    fields: [companies.ownerUserId],
    references: [users.id],
  }),
  cases: many(cases),
  communicationLogs: many(communicationLogs),
}));

/**
 * `cases` 的关联关系定义。
 *
 * 用途：
 * - 描述案件与组织、客户、企业、负责人、协作者的关联
 * - 为基于案件聚合查询沟通记录等子实体提供类型信息
 *
 * @returns cases 相关 relations
 */
export const casesRelations = relations(cases, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [cases.orgId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [cases.customerId],
    references: [customers.id],
  }),
  group: one(groups, {
    fields: [cases.groupId],
    references: [groups.id],
  }),
  company: one(companies, {
    fields: [cases.companyId],
    references: [companies.id],
  }),
  ownerUser: one(users, {
    relationName: "case_owner",
    fields: [cases.ownerUserId],
    references: [users.id],
  }),
  assistantUser: one(users, {
    relationName: "case_assistant",
    fields: [cases.assistantUserId],
    references: [users.id],
  }),
  billingRiskAcknowledger: one(users, {
    relationName: "case_billing_risk_ack",
    fields: [cases.billingRiskAcknowledgedBy],
    references: [users.id],
  }),
  communicationLogs: many(communicationLogs),
  stageHistory: many(caseStageHistory),
}));

/**
 * `case_stage_history` 的关联关系定义。
 *
 * @returns case_stage_history 相关 relations
 */
export const caseStageHistoryRelations = relations(
  caseStageHistory,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [caseStageHistory.orgId],
      references: [organizations.id],
    }),
    case: one(cases, {
      fields: [caseStageHistory.caseId],
      references: [cases.id],
    }),
    changedByUser: one(users, {
      fields: [caseStageHistory.changedBy],
      references: [users.id],
    }),
  }),
);

/**
 * `case_templates` 的关联关系定义。
 *
 * @returns case_templates 相关 relations
 */
export const caseTemplatesRelations = relations(caseTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [caseTemplates.orgId],
    references: [organizations.id],
  }),
}));

/**
 * `communication_logs` 的关联关系定义。
 *
 * 用途：
 * - 描述沟通记录与组织、案件、客户、企业、创建人的可选关联
 * - 为后续以 relation 方式读取上下文对象提供类型化入口
 *
 * @returns communication_logs 相关 relations
 */
export const communicationLogsRelations = relations(
  communicationLogs,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [communicationLogs.orgId],
      references: [organizations.id],
    }),
    case: one(cases, {
      fields: [communicationLogs.caseId],
      references: [cases.id],
    }),
    customer: one(customers, {
      fields: [communicationLogs.customerId],
      references: [customers.id],
    }),
    company: one(companies, {
      fields: [communicationLogs.companyId],
      references: [companies.id],
    }),
    creator: one(users, {
      fields: [communicationLogs.createdBy],
      references: [users.id],
    }),
  }),
);

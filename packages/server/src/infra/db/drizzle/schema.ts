import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
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
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
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
 * `cases` 表定义。
 *
 * 用途：
 * - 表示案件主对象，是业务流程的核心实体
 * - 关联客户、企业、负责人等关键对象
 * - 承载案件状态、优先级、风险等级以及关键时间字段
 *
 * 说明：
 * - 该定义对齐 `001_init.sql` 与 `009_core_entities.up.sql`
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
  cases: many(cases),
  communicationLogs: many(communicationLogs),
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
  ownedCompanies: many(companies),
  ownedCases: many(cases, { relationName: "case_owner" }),
  assistedCases: many(cases, { relationName: "case_assistant" }),
  createdCommunicationLogs: many(communicationLogs),
}));

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
  communicationLogs: many(communicationLogs),
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

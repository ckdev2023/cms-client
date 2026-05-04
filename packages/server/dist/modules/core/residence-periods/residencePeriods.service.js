/* eslint-disable complexity, jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns, max-lines, max-lines-per-function */
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  DEFAULT_REMINDER_SCHEDULE,
  resolveReminderPlans,
} from "./reminderBlueprintContract";
const RESIDENCE_PERIOD_COLS =
  "id, org_id, case_id, customer_id, visa_type, status_of_residence, period_years, period_label, valid_from::text as valid_from, valid_until::text as valid_until, card_number, is_current, entry_date::text as entry_date, reminder_created, notes, created_by, created_at, updated_at";
/**
 *
 * @param value
 */
export function toDateOnlyString(value) {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) {
    const y = String(value.getFullYear());
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  throw new BadRequestException("Invalid date value");
}
function toTimestampString(value) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new BadRequestException("Invalid timestamp value");
}
function toNullableInteger(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
/**
 *
 * @param row
 */
export function mapResidencePeriodRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    customerId: row.customer_id,
    visaType: row.visa_type,
    statusOfResidence: row.status_of_residence,
    periodYears: toNullableInteger(row.period_years),
    periodLabel: row.period_label,
    validFrom: toDateOnlyString(row.valid_from),
    validUntil: toDateOnlyString(row.valid_until),
    cardNumber: row.card_number,
    isCurrent: row.is_current,
    entryDate: row.entry_date ? toDateOnlyString(row.entry_date) : null,
    reminderCreated: row.reminder_created,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}
function requireDateOrder(validFrom, validUntil) {
  if (validFrom > validUntil) {
    throw new BadRequestException(
      "validFrom must be earlier than or equal to validUntil",
    );
  }
}
function requireNonNegativeInteger(value, field) {
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`${field} must be a non-negative integer`);
  }
}
/**
 *
 */
let ResidencePeriodsService = class ResidencePeriodsService {
  pool;
  timelineService;
  /**
   *
   * @param pool
   * @param timelineService
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   *
   * @param ctx
   * @param input
   */
  async create(ctx, input) {
    requireDateOrder(input.validFrom, input.validUntil);
    requireNonNegativeInteger(input.periodYears, "periodYears");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const created = await tenantDb.transaction(async (tx) => {
      await this.assertCaseAndCustomer(
        tx,
        ctx.orgId,
        input.caseId,
        input.customerId,
      );
      if (input.isCurrent ?? false) {
        await this.clearCurrentPeriods(tx, ctx.orgId, input.customerId);
      }
      const result = await tx.query(
        `
          insert into residence_periods (
            org_id, case_id, customer_id, visa_type, status_of_residence,
            period_years, period_label, valid_from, valid_until, card_number,
            is_current, entry_date, notes, created_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          returning ${RESIDENCE_PERIOD_COLS}
        `,
        [
          ctx.orgId,
          input.caseId,
          input.customerId,
          input.visaType,
          input.statusOfResidence,
          input.periodYears ?? null,
          input.periodLabel ?? null,
          input.validFrom,
          input.validUntil,
          input.cardNumber ?? null,
          input.isCurrent ?? false,
          input.entryDate ?? null,
          input.notes ?? null,
          ctx.userId,
        ],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to create residence period");
      const createdPeriod = mapResidencePeriodRow(row);
      const reminderCreated = await this.syncExpiryReminders(
        tx,
        ctx,
        createdPeriod,
      );
      if (reminderCreated) {
        await tx.query(
          `update residence_periods set reminder_created = true, updated_at = now() where id = $1 and org_id = $2`,
          [createdPeriod.id, ctx.orgId],
        );
        createdPeriod.reminderCreated = true;
      }
      return createdPeriod;
    });
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: created.caseId,
      action: "residence_period.created",
      payload: {
        residencePeriodId: created.id,
        customerId: created.customerId,
        validUntil: created.validUntil,
        isCurrent: created.isCurrent,
      },
    });
    return created;
  }
  /**
   *
   * @param ctx
   * @param input
   */
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = ["org_id = $1"];
    const params = [ctx.orgId];
    if (input.caseId) {
      params.push(input.caseId);
      where.push(`case_id = $${String(params.length)}`);
    }
    if (input.customerId) {
      params.push(input.customerId);
      where.push(`customer_id = $${String(params.length)}`);
    }
    if (input.currentOnly) {
      where.push("is_current = true");
    }
    if (input.expiringBefore) {
      params.push(input.expiringBefore);
      where.push(`valid_until <= $${String(params.length)}`);
    }
    const countResult = await tenantDb.query(
      `select count(*)::text as count from residence_periods where ${where.join(" and ")}`,
      params,
    );
    const listParams = [...params, limit, offset];
    const listResult = await tenantDb.query(
      `
        select ${RESIDENCE_PERIOD_COLS}
        from residence_periods
        where ${where.join(" and ")}
        order by valid_until asc, created_at desc
        limit $${String(params.length + 1)}
        offset $${String(params.length + 2)}
      `,
      listParams,
    );
    return {
      items: listResult.rows.map(mapResidencePeriodRow),
      total: Number(countResult.rows.at(0)?.count ?? "0"),
    };
  }
  /**
   *
   * @param ctx
   * @param id
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        select ${RESIDENCE_PERIOD_COLS}
        from residence_periods
        where id = $1 and org_id = $2
        limit 1
      `,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapResidencePeriodRow(row) : null;
  }
  /**
   *
   * @param ctx
   * @param id
   * @param input
   */
  async update(ctx, id, input) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException("No fields to update");
    }
    requireNonNegativeInteger(input.periodYears, "periodYears");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const updated = await tenantDb.transaction(async (tx) => {
      const current = await this.getForUpdate(tx, ctx.orgId, id);
      if (!current) throw new NotFoundException("Residence period not found");
      const nextValidFrom = input.validFrom ?? current.validFrom;
      const nextValidUntil = input.validUntil ?? current.validUntil;
      requireDateOrder(nextValidFrom, nextValidUntil);
      const nextIsCurrent = input.isCurrent ?? current.isCurrent;
      if (nextIsCurrent) {
        await this.clearCurrentPeriods(tx, ctx.orgId, current.customerId, id);
      }
      const result = await tx.query(
        `
          update residence_periods
          set visa_type = $3,
              status_of_residence = $4,
              period_years = $5,
              period_label = $6,
              valid_from = $7,
              valid_until = $8,
              card_number = $9,
              is_current = $10,
              entry_date = $11,
              notes = $12,
              updated_at = now()
          where id = $1 and org_id = $2
          returning ${RESIDENCE_PERIOD_COLS}
        `,
        [
          id,
          ctx.orgId,
          input.visaType ?? current.visaType,
          input.statusOfResidence ?? current.statusOfResidence,
          input.periodYears === undefined
            ? current.periodYears
            : input.periodYears,
          input.periodLabel === undefined
            ? current.periodLabel
            : input.periodLabel,
          nextValidFrom,
          nextValidUntil,
          input.cardNumber === undefined
            ? current.cardNumber
            : input.cardNumber,
          nextIsCurrent,
          input.entryDate === undefined ? current.entryDate : input.entryDate,
          input.notes === undefined ? current.notes : input.notes,
        ],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to update residence period");
      const next = mapResidencePeriodRow(row);
      const reminderCreated = await this.syncExpiryReminders(tx, ctx, next);
      if (reminderCreated !== next.reminderCreated) {
        await tx.query(
          `update residence_periods set reminder_created = $3, updated_at = now() where id = $1 and org_id = $2`,
          [next.id, ctx.orgId, reminderCreated],
        );
        next.reminderCreated = reminderCreated;
      }
      return next;
    });
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: updated.caseId,
      action: "residence_period.updated",
      payload: {
        residencePeriodId: updated.id,
        validUntil: updated.validUntil,
        isCurrent: updated.isCurrent,
      },
    });
    return updated;
  }
  async assertCaseAndCustomer(tx, orgId, caseId, customerId) {
    const caseResult = await tx.query(
      `
        select id, customer_id
        from cases
        where id = $1 and org_id = $2
        limit 1
      `,
      [caseId, orgId],
    );
    const currentCase = caseResult.rows.at(0);
    if (!currentCase)
      throw new BadRequestException("Case not found in current organization");
    if (currentCase.customer_id !== customerId) {
      throw new BadRequestException(
        "customerId does not match case owner customer",
      );
    }
    const customerResult = await tx.query(
      `select id from customers where id = $1 and org_id = $2 limit 1`,
      [customerId, orgId],
    );
    if ((customerResult.rowCount ?? 0) === 0) {
      throw new BadRequestException(
        "Customer not found in current organization",
      );
    }
  }
  async clearCurrentPeriods(tx, orgId, customerId, excludeId) {
    const params = [orgId, customerId];
    let excludeSql = "";
    if (excludeId) {
      params.push(excludeId);
      excludeSql = ` and id <> $${String(params.length)}`;
    }
    await tx.query(
      `
        update residence_periods
        set is_current = false, updated_at = now()
        where org_id = $1 and customer_id = $2 and is_current = true${excludeSql}
      `,
      params,
    );
  }
  async getForUpdate(tx, orgId, id) {
    const result = await tx.query(
      `
        select ${RESIDENCE_PERIOD_COLS}
        from residence_periods
        where id = $1 and org_id = $2
        for update
      `,
      [id, orgId],
    );
    const row = result.rows.at(0);
    return row ? mapResidencePeriodRow(row) : null;
  }
  /**
   * 180/90/30 提醒生成 — 失败回滚安全。
   *
   * 使用 SAVEPOINT 隔离提醒 INSERT：如果任何一条提醒写入失败，
   * 回滚到 savepoint 并返回 false（reminder_created = false），
   * 但不中断外层事务（residence_period 仍正常创建/更新）。
   *
   * 结案阻断规则依赖 reminder_created = true，
   * 因此提醒生成失败会阻止案件进入成功结案。
   * @param tx
   * @param ctx
   * @param period
   */
  async syncExpiryReminders(tx, ctx, period) {
    const blueprint = await this.fetchReminderBlueprint(
      tx,
      ctx.orgId,
      period.caseId,
    );
    const plans = resolveReminderPlans(blueprint, period.id, period.validUntil);
    await this.cancelExistingReminders(
      tx,
      ctx.orgId,
      plans.map((plan) => plan.dedupeKey),
    );
    if (!period.isCurrent) return false;
    const ownerResult = await tx.query(
      `
        select owner_user_id
        from cases
        where id = $1 and org_id = $2
        limit 1
      `,
      [period.caseId, ctx.orgId],
    );
    const owner = ownerResult.rows.at(0);
    if (!owner) return false;
    await tx.query("SAVEPOINT sp_reminders");
    try {
      for (const plan of plans) {
        await tx.query(
          `
            insert into reminders (
              org_id, case_id, target_type, target_id, remind_at,
              recipient_type, recipient_id, channel, dedupe_key, payload_snapshot
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
          `,
          [
            ctx.orgId,
            period.caseId,
            "customer",
            period.customerId,
            plan.remindAt,
            plan.recipientType,
            owner.owner_user_id,
            plan.channel,
            plan.dedupeKey,
            JSON.stringify({
              residencePeriodId: period.id,
              validUntil: period.validUntil,
              daysBefore: plan.daysBefore,
              statusOfResidence: period.statusOfResidence,
            }),
          ],
        );
      }
      await tx.query("RELEASE SAVEPOINT sp_reminders");
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[ResidencePeriodsService.syncExpiryReminders] reminder INSERT failed for period ${period.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      await tx.query("ROLLBACK TO SAVEPOINT sp_reminders");
      return false;
    }
  }
  /**
   * 从 case_templates 查找当前案件模板的 reminder_schedule_blueprint。
   * 无模板或无 blueprint 时降级为 DEFAULT_REMINDER_SCHEDULE。
   * @param tx
   * @param orgId
   * @param caseId
   */
  async fetchReminderBlueprint(tx, orgId, caseId) {
    const result = await tx.query(
      `
        select ct.reminder_schedule_blueprint
        from case_templates ct
        join cases c on c.case_type_code = ct.case_type and c.org_id = ct.org_id
        where c.id = $1 and c.org_id = $2
          and ct.active_flag = true
        order by ct.updated_at desc
        limit 1
      `,
      [caseId, orgId],
    );
    const row = result.rows.at(0);
    if (!row?.reminder_schedule_blueprint) return DEFAULT_REMINDER_SCHEDULE;
    const raw = row.reminder_schedule_blueprint;
    if (!Array.isArray(raw) || raw.length === 0)
      return DEFAULT_REMINDER_SCHEDULE;
    return raw;
  }
  async cancelExistingReminders(tx, orgId, dedupeKeys) {
    if (dedupeKeys.length === 0) return;
    const placeholders = dedupeKeys
      .map((_, index) => `$${String(index + 2)}`)
      .join(", ");
    await tx.query(
      `
        update reminders
        set send_status = 'canceled', updated_at = now()
        where org_id = $1
          and dedupe_key in (${placeholders})
          and send_status = 'pending'
      `,
      [orgId, ...dedupeKeys],
    );
  }
};
ResidencePeriodsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  ResidencePeriodsService,
);
export { ResidencePeriodsService };
//# sourceMappingURL=residencePeriods.service.js.map

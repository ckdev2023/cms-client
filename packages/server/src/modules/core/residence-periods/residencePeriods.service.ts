/* eslint-disable complexity, jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns, max-lines, max-lines-per-function */

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { ResidencePeriod, Reminder } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

const RESIDENCE_PERIOD_COLS =
  "id, org_id, case_id, customer_id, visa_type, status_of_residence, period_years, period_label, valid_from, valid_until, card_number, is_current, notes, created_by, created_at, updated_at";
const REMINDER_OFFSETS_DAYS = [180, 90, 30] as const;

type ResidencePeriodQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  customer_id: string;
  visa_type: string;
  status_of_residence: string;
  period_years: unknown;
  period_label: string | null;
  valid_from: unknown;
  valid_until: unknown;
  card_number: string | null;
  is_current: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
};

type OwnerQueryRow = {
  owner_user_id: string;
};

type ReminderPlan = {
  daysBefore: number;
  remindAt: string;
  dedupeKey: string;
};

/**
 *
 */
export type ResidencePeriodCreateInput = {
  caseId: string;
  customerId: string;
  visaType: string;
  statusOfResidence: string;
  periodYears?: number | null;
  periodLabel?: string | null;
  validFrom: string;
  validUntil: string;
  cardNumber?: string | null;
  isCurrent?: boolean;
  notes?: string | null;
};

/**
 *
 */
export type ResidencePeriodUpdateInput = {
  visaType?: string;
  statusOfResidence?: string;
  periodYears?: number | null;
  periodLabel?: string | null;
  validFrom?: string;
  validUntil?: string;
  cardNumber?: string | null;
  isCurrent?: boolean;
  notes?: string | null;
};

/**
 *
 */
export type ResidencePeriodListInput = {
  caseId?: string;
  customerId?: string;
  currentOnly?: boolean;
  expiringBefore?: string;
  page?: number;
  limit?: number;
};

function toDateOnlyString(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  throw new BadRequestException("Invalid date value");
}

function toTimestampString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new BadRequestException("Invalid timestamp value");
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 *
 * @param row
 */
export function mapResidencePeriodRow(
  row: ResidencePeriodQueryRow,
): ResidencePeriod {
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
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

function requireDateOrder(validFrom: string, validUntil: string): void {
  if (validFrom > validUntil) {
    throw new BadRequestException(
      "validFrom must be earlier than or equal to validUntil",
    );
  }
}

function requireNonNegativeInteger(
  value: number | null | undefined,
  field: string,
): void {
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`${field} must be a non-negative integer`);
  }
}

function buildReminderPlans(
  periodId: string,
  validUntil: string,
): ReminderPlan[] {
  const [year, month, day] = validUntil.split("-").map(Number);
  if (!year || !month || !day) {
    throw new BadRequestException("Invalid validUntil");
  }

  const base = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  return REMINDER_OFFSETS_DAYS.map((daysBefore) => {
    const remindAt = new Date(
      base - daysBefore * 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      daysBefore,
      remindAt,
      dedupeKey: `residence_period:${periodId}:${String(daysBefore)}`,
    };
  });
}

/**
 *
 */
@Injectable()
export class ResidencePeriodsService {
  /**
   *
   * @param pool
   * @param timelineService
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   *
   * @param ctx
   * @param input
   */
  async create(
    ctx: RequestContext,
    input: ResidencePeriodCreateInput,
  ): Promise<ResidencePeriod> {
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

      const result = await tx.query<ResidencePeriodQueryRow>(
        `
          insert into residence_periods (
            org_id, case_id, customer_id, visa_type, status_of_residence,
            period_years, period_label, valid_from, valid_until, card_number,
            is_current, notes, created_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          input.notes ?? null,
          ctx.userId,
        ],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to create residence period");
      const createdPeriod = mapResidencePeriodRow(row);

      await this.syncExpiryReminders(tx, ctx, createdPeriod);
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
  async list(
    ctx: RequestContext,
    input: ResidencePeriodListInput = {},
  ): Promise<{ items: ResidencePeriod[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where = ["org_id = $1"];
    const params: unknown[] = [ctx.orgId];

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

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from residence_periods where ${where.join(" and ")}`,
      params,
    );

    const listParams = [...params, limit, offset];
    const listResult = await tenantDb.query<ResidencePeriodQueryRow>(
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
  async get(ctx: RequestContext, id: string): Promise<ResidencePeriod | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ResidencePeriodQueryRow>(
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
  async update(
    ctx: RequestContext,
    id: string,
    input: ResidencePeriodUpdateInput,
  ): Promise<ResidencePeriod> {
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

      const result = await tx.query<ResidencePeriodQueryRow>(
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
              notes = $11,
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
          input.notes === undefined ? current.notes : input.notes,
        ],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to update residence period");
      const next = mapResidencePeriodRow(row);
      await this.syncExpiryReminders(tx, ctx, next);
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

  private async assertCaseAndCustomer(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
    customerId: string,
  ): Promise<void> {
    const caseResult = await tx.query<{ id: string; customer_id: string }>(
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

    const customerResult = await tx.query<{ id: string }>(
      `select id from customers where id = $1 and org_id = $2 limit 1`,
      [customerId, orgId],
    );
    if ((customerResult.rowCount ?? 0) === 0) {
      throw new BadRequestException(
        "Customer not found in current organization",
      );
    }
  }

  private async clearCurrentPeriods(
    tx: TenantDbTx,
    orgId: string,
    customerId: string,
    excludeId?: string,
  ): Promise<void> {
    const params: unknown[] = [orgId, customerId];
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

  private async getForUpdate(
    tx: TenantDbTx,
    orgId: string,
    id: string,
  ): Promise<ResidencePeriod | null> {
    const result = await tx.query<ResidencePeriodQueryRow>(
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

  private async syncExpiryReminders(
    tx: TenantDbTx,
    ctx: RequestContext,
    period: ResidencePeriod,
  ): Promise<void> {
    const plans = buildReminderPlans(period.id, period.validUntil);
    await this.cancelExistingReminders(
      tx,
      ctx.orgId,
      plans.map((plan) => plan.dedupeKey),
    );
    if (!period.isCurrent) return;

    const ownerResult = await tx.query<OwnerQueryRow>(
      `
        select owner_user_id
        from cases
        where id = $1 and org_id = $2
        limit 1
      `,
      [period.caseId, ctx.orgId],
    );
    const owner = ownerResult.rows.at(0);
    if (!owner) return;

    for (const plan of plans) {
      await tx.query<Reminder>(
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
          "internal_user",
          owner.owner_user_id,
          "system",
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
  }

  private async cancelExistingReminders(
    tx: TenantDbTx,
    orgId: string,
    dedupeKeys: string[],
  ): Promise<void> {
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
}

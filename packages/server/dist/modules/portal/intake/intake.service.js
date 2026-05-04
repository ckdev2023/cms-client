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
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { mapIntakeFormRow } from "../model/portalEntities";
import { isValidFormKind } from "./intake.types";
const FORM_COLS = `id, app_user_id, lead_id, case_draft_id, form_kind, form_data, status, created_at, updated_at`;
/**
 * IntakeForms 服务：信息采集表单 CRUD。
 */
let IntakeService = class IntakeService {
  pool;
  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 创建草稿。
   * @param input 创建参数
   * @returns 创建的表单
   */
  async create(input) {
    const formKind = input.formKind ?? "general";
    if (!isValidFormKind(formKind)) {
      throw new BadRequestException(
        `Invalid form_kind: ${String(formKind)}. Must be one of: general, bmv_questionnaire, bmv_quote`,
      );
    }
    const result = await this.pool.query(
      `insert into intake_forms (app_user_id, lead_id, form_kind, form_data, status)
       values ($1, $2, $3, $4::jsonb, 'draft') returning ${FORM_COLS}`,
      [
        input.appUserId,
        input.leadId ?? null,
        formKind,
        JSON.stringify(input.formData ?? {}),
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create intake form");
    return mapIntakeFormRow(row);
  }
  /**
   * 查看详情。
   * @param id 表单 ID
   * @returns 表单或 null
   */
  async get(id) {
    const result = await this.pool.query(
      `select ${FORM_COLS} from intake_forms where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapIntakeFormRow(row) : null;
  }
  /**
   * 列表查询。
   * @param input 查询参数
   * @returns 分页结果
   */
  async list(input = {}) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (input.appUserId) {
      params.push(input.appUserId);
      where.push(`app_user_id = $${String(params.length)}`);
    }
    if (input.leadId) {
      params.push(input.leadId);
      where.push(`lead_id = $${String(params.length)}`);
    }
    if (input.formKind) {
      if (!isValidFormKind(input.formKind)) {
        throw new BadRequestException(
          `Invalid form_kind filter: ${String(input.formKind)}`,
        );
      }
      params.push(input.formKind);
      where.push(`form_kind = $${String(params.length)}`);
    }
    if (input.status) {
      params.push(input.status);
      where.push(`status = $${String(params.length)}`);
    }
    const clause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await this.pool.query(
      `select count(*)::text as count from intake_forms ${clause}`,
      params,
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    params.push(limit, offset);
    const dataResult = await this.pool.query(
      `select ${FORM_COLS} from intake_forms ${clause} order by created_at desc limit $${String(params.length - 1)} offset $${String(params.length)}`,
      params,
    );
    return { items: dataResult.rows.map(mapIntakeFormRow), total };
  }
  /**
   * 更新草稿（提交后不可修改）。
   * @param id 表单 ID
   * @param callerId 调用方 AppUser ID
   * @param input 更新参数
   * @returns 更新后的表单
   */
  async update(id, callerId, input) {
    const current = await this.get(id);
    if (!current) throw new BadRequestException("Intake form not found");
    if (current.appUserId !== callerId)
      throw new BadRequestException("Can only update own intake form");
    if (current.status === "submitted")
      throw new BadRequestException("Cannot update submitted form");
    const sets = [];
    const params = [];
    let idx = 1;
    if (input.formData !== undefined) {
      sets.push(`form_data = $${String(idx++)}::jsonb`);
      params.push(JSON.stringify(input.formData));
    }
    if (input.leadId !== undefined) {
      sets.push(`lead_id = $${String(idx++)}`);
      params.push(input.leadId);
    }
    if (sets.length === 0) return current;
    sets.push("updated_at = now()");
    params.push(id);
    const result = await this.pool.query(
      `update intake_forms set ${sets.join(", ")} where id = $${String(idx)} returning ${FORM_COLS}`,
      params,
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Intake form not found");
    return mapIntakeFormRow(row);
  }
  /**
   * 提交表单（status: draft → submitted）。
   * @param id 表单 ID
   * @param callerId 调用方 AppUser ID
   * @returns 提交后的表单
   */
  async submit(id, callerId) {
    const current = await this.get(id);
    if (!current) throw new BadRequestException("Intake form not found");
    if (current.appUserId !== callerId)
      throw new BadRequestException("Can only submit own intake form");
    if (current.status === "submitted")
      throw new BadRequestException("Already submitted");
    const result = await this.pool.query(
      `update intake_forms set status = 'submitted', updated_at = now() where id = $1 returning ${FORM_COLS}`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Intake form not found");
    return mapIntakeFormRow(row);
  }
};
IntakeService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  IntakeService,
);
export { IntakeService };
//# sourceMappingURL=intake.service.js.map

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { optUuid, reqUuid } from "../shared/uuid-parsers";
import { LeadsAdminService } from "./leads.admin.service";
import {
  requireCtx,
  parsePage,
  parseLimit,
  optStr,
  reqStr,
  optNum,
  parseScope,
  strArr,
  optBool,
  parseLocalizedNames,
} from "./leads.admin.parsers";

import type { RequestContext } from "../tenancy/requestContext";

type HttpRequest = { requestContext?: RequestContext };

type ListLeadsQuery = {
  scope?: unknown;
  status?: unknown;
  ownerUserId?: unknown;
  groupId?: unknown;
  businessType?: unknown;
  search?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  page?: unknown;
  limit?: unknown;
};
type UpdateLeadBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  sourceChannel?: unknown;
  referrer?: unknown;
  intendedCaseType?: unknown;
  groupId?: unknown;
  ownerUserId?: unknown;
  nextAction?: unknown;
  nextFollowUpAt?: unknown;
  quoteAmount?: unknown;
  note?: unknown;
};
type StatusBody = { status?: unknown; lostReason?: unknown };
type FollowupBody = {
  channel?: unknown;
  summary?: unknown;
  conclusion?: unknown;
  nextAction?: unknown;
  nextFollowUpAt?: unknown;
};
type BulkAssignBody = { leadIds?: unknown; ownerUserId?: unknown };
type BulkFollowupBody = {
  leadIds?: unknown;
  channel?: unknown;
  summary?: unknown;
};
type BulkStatusBody = {
  leadIds?: unknown;
  status?: unknown;
  lostReason?: unknown;
};
type BulkTagsBody = { leadIds?: unknown; tags?: unknown };
type CreateLeadBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  sourceChannel?: unknown;
  referrer?: unknown;
  intendedCaseType?: unknown;
  groupId?: unknown;
  ownerUserId?: unknown;
  nextAction?: unknown;
  nextFollowUpAt?: unknown;
  quoteAmount?: unknown;
  note?: unknown;
  language?: unknown;
};
type ConvertCustomerBody = {
  customerId?: unknown;
  localizedNames?: unknown;
  confirmDedup?: unknown;
};
type ConvertCaseBody = {
  caseTypeCode?: unknown;
  ownerUserId?: unknown;
  groupId?: unknown;
};
type BulkExportBody = { leadIds?: unknown };
type DedupQuery = { phone?: unknown; email?: unknown };

const UuidParam = () => Param("id", new ParseUUIDPipe());

/**
 * Admin Lead 管理コントローラ。
 */
@Controller("admin/leads")
export class LeadsAdminController {
  /**
   * コンストラクタ。
   * @param svc Lead 管理サービス
   */
  constructor(
    @Inject(LeadsAdminService) private readonly svc: LeadsAdminService,
  ) {}

  /**
   * Lead を新規作成する。
   * @param req HTTP リクエスト
   * @param body 作成リクエストボディ
   * @returns 作成された Lead
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateLeadBody) {
    return this.svc.create(requireCtx(req), {
      name: reqStr(body.name, "name"),
      phone: optStr(body.phone, "phone"),
      email: optStr(body.email, "email"),
      sourceChannel: optStr(body.sourceChannel, "sourceChannel"),
      referrer: optStr(body.referrer, "referrer"),
      intendedCaseType: optStr(body.intendedCaseType, "intendedCaseType"),
      groupId: optUuid(body.groupId, "groupId"),
      ownerUserId: optUuid(body.ownerUserId, "ownerUserId"),
      nextAction: optStr(body.nextAction, "nextAction"),
      nextFollowUpAt: optStr(body.nextFollowUpAt, "nextFollowUpAt"),
      quoteAmount: optNum(body.quoteAmount, "quoteAmount"),
      note: optStr(body.note, "note"),
      language: optStr(body.language, "language"),
    });
  }

  /**
   * Lead 一覧を取得する。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns Lead 一覧と総件数
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListLeadsQuery) {
    const ctx = requireCtx(req);
    return this.svc.list(ctx, {
      scope: parseScope(query.scope),
      status: optStr(query.status, "status"),
      ownerUserId: optStr(query.ownerUserId, "ownerUserId"),
      groupId: optStr(query.groupId, "groupId"),
      businessType: optStr(query.businessType, "businessType"),
      search: optStr(query.search, "search"),
      dateFrom: optStr(query.dateFrom, "dateFrom"),
      dateTo: optStr(query.dateTo, "dateTo"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 電話番号/メールで重複候補を検索する（org_id 強制）。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns 重複候補の Lead と Customer
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Get("dedup")
  async dedup(@Req() req: HttpRequest, @Query() query: DedupQuery) {
    return this.svc.dedup(requireCtx(req), {
      phone: optStr(query.phone, "phone"),
      email: optStr(query.email, "email"),
    });
  }

  /**
   * Lead 詳細を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns Lead 詳細集約
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Get(":id")
  async getDetail(@Req() req: HttpRequest, @UuidParam() id: string) {
    return this.svc.getDetail(requireCtx(req), id);
  }

  /**
   * Lead → Customer 転化（顧客作成 + converted_customer_id 回填）。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body 転化リクエストボディ
   * @returns 更新後の Lead と customerId
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/convert-customer")
  async convertCustomer(
    @Req() req: HttpRequest,
    @UuidParam() id: string,
    @Body() body: ConvertCustomerBody,
  ) {
    return this.svc.convertCustomer(requireCtx(req), id, {
      customerId: optUuid(body.customerId, "customerId"),
      localizedNames: parseLocalizedNames(body.localizedNames),
      confirmDedup: optBool(body.confirmDedup, "confirmDedup"),
    });
  }

  /** Lead → Case 転化。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body 転化リクエストボディ
   * @returns Lead + caseId
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/convert-case")
  async convertCase(
    @Req() req: HttpRequest,
    @UuidParam() id: string,
    @Body() body: ConvertCaseBody,
  ) {
    return this.svc.convertCase(requireCtx(req), id, {
      caseTypeCode: reqStr(body.caseTypeCode, "caseTypeCode"),
      ownerUserId: reqUuid(body.ownerUserId, "ownerUserId"),
      groupId: optUuid(body.groupId, "groupId"),
    });
  }

  /**
   * Lead の業務フィールドを更新する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body 更新リクエストボディ
   * @returns 更新後の Lead
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @UuidParam() id: string,
    @Body() body: UpdateLeadBody,
  ) {
    return this.svc.update(requireCtx(req), id, {
      name: optStr(body.name, "name"),
      phone: optStr(body.phone, "phone"),
      email: optStr(body.email, "email"),
      sourceChannel: optStr(body.sourceChannel, "sourceChannel"),
      referrer: optStr(body.referrer, "referrer"),
      intendedCaseType: optStr(body.intendedCaseType, "intendedCaseType"),
      groupId: optUuid(body.groupId, "groupId"),
      ownerUserId: optUuid(body.ownerUserId, "ownerUserId"),
      nextAction: optStr(body.nextAction, "nextAction"),
      nextFollowUpAt: optStr(body.nextFollowUpAt, "nextFollowUpAt"),
      quoteAmount: optNum(body.quoteAmount, "quoteAmount"),
      note: optStr(body.note, "note"),
    });
  }

  /**
   * Lead ステータスを遷移させる。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body ステータス遷移リクエストボディ
   * @returns 更新後の Lead
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Patch(":id/status")
  async transitionStatus(
    @Req() req: HttpRequest,
    @UuidParam() id: string,
    @Body() body: StatusBody,
  ) {
    return this.svc.transitionStatus(requireCtx(req), id, {
      status: reqStr(body.status, "status"),
      lostReason: optStr(body.lostReason, "lostReason"),
    });
  }

  /**
   * Lead にフォローアップを追加する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body フォローアップリクエストボディ
   * @returns 作成されたフォローアップ
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/followups")
  async addFollowup(
    @Req() req: HttpRequest,
    @UuidParam() id: string,
    @Body() body: FollowupBody,
  ) {
    return this.svc.addFollowup(requireCtx(req), id, {
      channel: reqStr(body.channel, "channel"),
      summary: optStr(body.summary, "summary"),
      conclusion: optStr(body.conclusion, "conclusion"),
      nextAction: optStr(body.nextAction, "nextAction"),
      nextFollowUpAt: optStr(body.nextFollowUpAt, "nextFollowUpAt"),
    });
  }

  /**
   * Lead のフォローアップ一覧を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns フォローアップ一覧
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Get(":id/followups")
  async listFollowups(@Req() req: HttpRequest, @UuidParam() id: string) {
    return this.svc.listFollowups(requireCtx(req), id);
  }

  /**
   * Lead のログ一覧を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns ログ一覧
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Get(":id/logs")
  async listLogs(@Req() req: HttpRequest, @UuidParam() id: string) {
    return this.svc.listLogs(requireCtx(req), id);
  }

  /** 一括担当者変更。
   * @param req HTTP リクエスト
   * @param body リクエストボディ
   * @returns 更新件数
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post("bulk/assign")
  async bulkAssign(@Req() req: HttpRequest, @Body() body: BulkAssignBody) {
    return this.svc.bulkAssign(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      ownerUserId: reqUuid(body.ownerUserId, "ownerUserId"),
    });
  }

  /** 一括フォローアップ追加。
   * @param req HTTP リクエスト
   * @param body リクエストボディ
   * @returns 更新件数
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post("bulk/followup")
  async bulkFollowup(@Req() req: HttpRequest, @Body() body: BulkFollowupBody) {
    return this.svc.bulkFollowup(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      channel: reqStr(body.channel, "channel"),
      summary: optStr(body.summary, "summary"),
    });
  }

  /** 一括ステータス変更。
   * @param req HTTP リクエスト
   * @param body リクエストボディ
   * @returns 更新件数
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post("bulk/status")
  async bulkStatus(@Req() req: HttpRequest, @Body() body: BulkStatusBody) {
    return this.svc.bulkStatus(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      status: reqStr(body.status, "status"),
      lostReason: optStr(body.lostReason, "lostReason"),
    });
  }

  /** 一括タグ更新。
   * @param req HTTP リクエスト
   * @param body リクエストボディ
   * @returns 更新件数
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post("bulk/tags")
  async bulkTags(@Req() req: HttpRequest, @Body() body: BulkTagsBody) {
    return this.svc.bulkTags(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      tags: strArr(body.tags, "tags"),
    });
  }

  /** 一括エクスポート。
   * @param req HTTP リクエスト
   * @param body リクエストボディ
   * @returns Lead 一覧
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post("bulk/export")
  async bulkExport(@Req() req: HttpRequest, @Body() body: BulkExportBody) {
    return this.svc.bulkExport(
      requireCtx(req),
      strArr(body.leadIds, "leadIds"),
    );
  }
}

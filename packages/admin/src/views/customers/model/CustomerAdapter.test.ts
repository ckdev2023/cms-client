import { describe, expect, it } from "vitest";
import type { CustomerCreateFormFields } from "../types";
import {
  adaptCommunicationLogListResult,
  adaptCustomerCaseListResult,
  adaptCustomerDetailDto,
  adaptCustomerSummaryDto,
  adaptCustomerDuplicateCandidates,
  adaptCustomerListResult,
  adaptCustomerRelationDto,
  adaptCustomerRelationListResult,
  adaptTimelineLogListResult,
  buildCustomerRelationPayload,
  buildCreateCustomerPayload,
  buildCustomerListSearchParams,
  buildUpdateCustomerPayload,
} from "./CustomerAdapter";

const CREATE_FIELDS: CustomerCreateFormFields = {
  customerType: "individual",
  displayName: "张伟（就劳）",
  group: "tokyo-1",
  legalName: "张伟",
  kana: "チョウ イ",
  gender: "男",
  birthDate: "1991-03-14",
  nationality: "中国",
  phone: "090-1234-5678",
  email: "zhang@example.com",
  referrer: "客户推荐",
  location: "JAPAN",
  sourceType: "REFERRAL",
  visaType: "engineer_specialist",
  referrerName: "田中先生",
  representativeName: "",
  avatar: "avatar.png",
  note: "prefer wechat",
};

const SUMMARY_DTO = {
  id: "cust-001",
  displayName: "张伟（就劳）",
  legalName: "张伟",
  furigana: "チョウ イ",
  customerNumber: "CUS-001",
  phone: "090-1234-5678",
  email: "zhang@example.com",
  totalCases: 2,
  activeCases: 1,
  lastContactDate: "2026-04-10",
  lastContactChannel: "WeChat",
  owner: { initials: "ZW", name: "张顾问" },
  referralSource: "客户推荐",
  group: "东京一组",
  bmvProfile: null,
};

describe("CustomerAdapter", () => {
  it("adapts customer list result from DTO", () => {
    const result = adaptCustomerListResult({ total: 1, items: [SUMMARY_DTO] });
    expect(result).toEqual({ total: 1, items: [SUMMARY_DTO] });
  });

  it("adapts customer detail DTO with flattened fields", () => {
    const result = adaptCustomerDetailDto({
      ...SUMMARY_DTO,
      nationality: "中国",
      gender: "男",
      birthDate: "1991-03-14",
      avatar: "avatar.png",
      note: "prefer wechat",
      location: "JAPAN",
      sourceType: "REFERRAL",
      visaType: "engineer_specialist",
      referrerName: "田中先生",
      archivedCases: 1,
      caseNames: ["技人国更新", "永住申请"],
      caseTitles: ["技人国更新", "永住申请"],
      caseTypeCodes: ["engineer_humanities_intl_visa", "permanent_residence"],
      lastCaseCreatedDate: "2026-04-01",
    });

    expect(result?.birthDate).toBe("1991-03-14");
    expect(result?.archivedCases).toBe(1);
    expect(result?.caseNames).toEqual(["技人国更新", "永住申请"]);
    expect(result?.caseTitles).toEqual(["技人国更新", "永住申请"]);
    expect(result?.caseTypeCodes).toEqual([
      "engineer_humanities_intl_visa",
      "permanent_residence",
    ]);
    expect(result?.location).toBe("JAPAN");
    expect(result?.sourceType).toBe("REFERRAL");
    expect(result?.visaType).toBe("engineer_specialist");
    expect(result?.referrerName).toBe("田中先生");
  });

  it("adapts nested baseProfile bmvProfile with snake_case fields", () => {
    const result = adaptCustomerSummaryDto({
      id: "cust-004",
      displayName: "佐藤美咲",
      legalName: "佐藤美咲",
      furigana: "サトウミサキ",
      customerNumber: "CUS-004",
      phone: "070-8888-1208",
      email: "misaki.sato@example.jp",
      totalCases: 0,
      activeCases: 0,
      lastContactDate: null,
      lastContactChannel: null,
      owner: { initials: "TK", name: "高橋健太" },
      referralSource: "広告（経営管理）",
      group: "東京一組",
      baseProfile: {
        bmvProfile: {
          questionnaire_status: "returned",
          quote_status: "confirmed",
          sign_status: "pending",
          questionnaire_sent_at: "2026-04-01T09:00:00+09:00",
          quote_confirmed_at: "2026-04-09T18:00:00+09:00",
          memo: "待签约后即可进入建案。",
        },
      },
    });

    expect(result?.bmvProfile).toEqual({
      questionnaireStatus: "returned",
      quoteStatus: "confirmed",
      signStatus: "pending",
      intakeStatus: "sign_pending",
      questionnaireSentAt: "2026-04-01T09:00:00+09:00",
      questionnaireReturnedAt: null,
      quoteGeneratedAt: null,
      quoteConfirmedAt: "2026-04-09T18:00:00+09:00",
      signedAt: null,
      note: "待签约后即可进入建案。",
      sourceLeadId: null,
      leadGroupId: null,
      leadOwnerUserId: null,
    });
  });

  it("defaults partial bmvProfile fields instead of dropping the customer", () => {
    const result = adaptCustomerSummaryDto({
      id: "cust-005",
      displayName: "田中一郎",
      legalName: "田中一郎",
      furigana: "タナカイチロウ",
      customerNumber: "CUS-005",
      phone: "070-0000-0005",
      email: "ichiro.tanaka@example.jp",
      totalCases: 0,
      activeCases: 0,
      lastContactDate: null,
      lastContactChannel: null,
      owner: { initials: "TN", name: "田中顾问" },
      referralSource: "紹介",
      group: "東京二組",
      bmvProfile: {
        note: "仅录入备注",
      },
    });

    expect(result?.bmvProfile).toEqual({
      questionnaireStatus: "not_started",
      quoteStatus: "not_started",
      signStatus: "not_started",
      intakeStatus: "not_started",
      questionnaireSentAt: null,
      questionnaireReturnedAt: null,
      quoteGeneratedAt: null,
      quoteConfirmedAt: null,
      signedAt: null,
      note: "仅录入备注",
      sourceLeadId: null,
      leadGroupId: null,
      leadOwnerUserId: null,
    });
  });
  it("treats empty-object bmvProfile as null instead of invalid summary", () => {
    const result = adaptCustomerSummaryDto({
      id: "cust-006",
      displayName: "铃木花子",
      legalName: "铃木花子",
      furigana: "スズキハナコ",
      customerNumber: "CUS-006",
      phone: "070-0000-0006",
      email: "hanako.suzuki@example.jp",
      totalCases: 0,
      activeCases: 0,
      lastContactDate: null,
      lastContactChannel: null,
      owner: { initials: "SZ", name: "铃木顾问" },
      referralSource: "官网",
      group: "大阪一組",
      bmvProfile: {},
    });

    expect(result).not.toBeNull();
    expect(result?.bmvProfile).toBeNull();
  });

  it("adapts related case list result with stable fallbacks", () => {
    const result = adaptCustomerCaseListResult({
      total: 2,
      items: [
        {
          id: "case-001",
          caseName: "技人国更新",
          caseTypeCode: "visa-change",
          stage: "补件中",
          ownerUserId: "owner-1",
          openedAt: "2026-04-01",
          updatedAt: "2026-04-10",
        },
        {
          id: "case-002",
          owner: { name: "高桥健太" },
          archivedAt: "2026-04-12",
        },
      ],
    });

    expect(result).toEqual([
      {
        id: "case-001",
        name: "技人国更新",
        type: "visa-change",
        stage: "补件中",
        status: "active",
        owner: "owner-1",
        ownerId: "owner-1",
        createdAt: "2026-04-01",
        updatedAt: "2026-04-10",
      },
      {
        id: "case-002",
        name: "",
        type: "",
        stage: "",
        status: "archived",
        owner: "高桥健太",
        ownerDisplayName: "高桥健太",
        createdAt: "",
        updatedAt: "",
      },
    ]);
  });

  it("adapts contact-person dto to customer relation", () => {
    expect(
      adaptCustomerRelationDto({
        id: "rel-001",
        name: "田中次郎",
        relationType: "representative",
        roleTitle: "法定代理人",
        phone: "090-9999-8888",
        email: "tanaka@example.com",
      }),
    ).toEqual({
      id: "rel-001",
      name: "田中次郎",
      kana: "",
      relationType: "agent",
      phone: "090-9999-8888",
      email: "tanaka@example.com",
      tags: ["法定代理人"],
      note: "",
    });
  });

  it("adapts contact-person list result and builds mutation payload", () => {
    expect(
      adaptCustomerRelationListResult({
        total: 1,
        items: [{ id: "rel-001", name: "田中次郎", relation_type: "parent" }],
      }),
    ).toEqual([
      {
        id: "rel-001",
        name: "田中次郎",
        kana: "",
        relationType: "parent",
        phone: "",
        email: "",
        tags: [],
        note: "",
      },
    ]);

    expect(
      buildCustomerRelationPayload({
        customerId: " cust-001 ",
        name: " 田中次郎 ",
        relationType: "parent",
        roleTitle: " 父亲 ",
        phone: " 090-1234-5678 ",
        email: " foo@example.com ",
      }),
    ).toEqual({
      customerId: "cust-001",
      name: "田中次郎",
      relationType: "parent",
      roleTitle: "父亲",
      phone: "090-1234-5678",
      email: "foo@example.com",
    });
  });

  it("adapts communication-log list result", () => {
    expect(
      adaptCommunicationLogListResult({
        total: 1,
        items: [
          {
            id: "comm-001",
            channelType: "wechat",
            visibleToClient: true,
            contentSummary: "确认补件时间表",
            fullContent: "客户承诺下周前补齐资料。",
            followUpRequired: true,
            followUpDueAt: "2026-04-02",
            createdBy: "user-001",
            createdAt: "2026-03-28T11:30:00.000Z",
          },
        ],
      }),
    ).toEqual([
      {
        id: "comm-001",
        type: "wechat",
        visibility: "customer",
        occurredAt: "2026-03-28T11:30:00.000Z",
        actor: "user-001",
        summary: "确认补件时间表",
        detail: "客户承诺下周前补齐资料。",
        nextAction: "2026-04-02",
      },
    ]);
  });
  it("adapts timeline log list result", () => {
    expect(
      adaptTimelineLogListResult([
        {
          id: "log-001",
          action: "customer.group_changed",
          actorUserId: "user-001",
          actorDisplayName: "山田花子",
          payload: { beforeGroup: "tokyo-1", afterGroup: "osaka" },
          createdAt: "2026-04-10T09:00:00.000Z",
        },
        {
          id: "log-002",
          action: "communication_log.created",
          actorUserId: null,
          payload: { channelType: "phone" },
          createdAt: "2026-04-10T10:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        id: "log-001",
        type: "info",
        actor: "山田花子",
        at: "2026-04-10T09:00:00.000Z",
        message: "调整客户分组：osaka",
      },
      {
        id: "log-002",
        type: "comm",
        actor: "System",
        at: "2026-04-10T10:00:00.000Z",
        message: "新增沟通记录：phone",
      },
    ]);
  });
  it("adapts duplicate candidates from server entity payload", () => {
    const result = adaptCustomerDuplicateCandidates([
      {
        customer: {
          id: "cust-001",
          baseProfile: {
            displayName: "张伟（就劳）",
            name_cn: "张伟",
            furigana: "チョウ イ",
            phone: "090-1234-5678",
            email: "zhang@example.com",
            group: "tokyo-1",
          },
          contacts: [],
        },
        matchedFields: ["phone", "email"],
      },
    ]);

    expect(result).toEqual([
      {
        id: "cust-001",
        displayName: "张伟（就劳）",
        legalName: "张伟",
        furigana: "チョウ イ",
        phone: "090-1234-5678",
        email: "zhang@example.com",
        group: "tokyo-1",
        matchedFields: ["phone", "email"],
      },
    ]);
  });

  it("builds list search params by omitting empty filters", () => {
    const params = buildCustomerListSearchParams({
      scope: "group",
      search: " 张伟 ",
      group: "",
      owner: "owner-1",
      activeCases: "yes",
      page: 2,
      limit: 50,
    });

    expect(params.toString()).toBe(
      "scope=group&search=%E5%BC%A0%E4%BC%9F&owner=owner-1&activeCases=yes&page=2&limit=50",
    );
  });

  it("builds create payload with server baseProfile field names", () => {
    expect(buildCreateCustomerPayload(CREATE_FIELDS)).toEqual({
      type: "individual",
      baseProfile: {
        displayName: "张伟（就劳）",
        legalName: "张伟",
        name_cn: "张伟",
        furigana: "チョウ イ",
        nationality: "中国",
        gender: "男",
        birthday: "1991-03-14",
        phone: "090-1234-5678",
        email: "zhang@example.com",
        group: "tokyo-1",
        referralSource: "客户推荐",
        location: "JAPAN",
        sourceType: "REFERRAL",
        visaType: "engineer_specialist",
        referrerName: "田中先生",
        avatar: "avatar.png",
        note: "prefer wechat",
      },
    });
  });

  it("builds update payload with owner_user_id", () => {
    expect(
      buildUpdateCustomerPayload({
        displayName: "张伟（更新）",
        legalName: "张伟",
        furigana: "チョウ イ",
        nationality: "中国",
        gender: "男",
        birthDate: "1991-03-14",
        phone: "090-1234-5678",
        email: "zhang@example.com",
        group: "tokyo-2",
        ownerId: "owner-2",
        referralSource: "客户推荐",
        location: "OVERSEAS",
        sourceType: "WEB",
        visaType: "student",
        referrerName: "佐藤様",
        avatar: "avatar.png",
        note: "updated",
      }),
    ).toEqual({
      type: "individual",
      baseProfile: {
        displayName: "张伟（更新）",
        legalName: "张伟",
        name_cn: "张伟",
        furigana: "チョウ イ",
        nationality: "中国",
        gender: "男",
        birthday: "1991-03-14",
        phone: "090-1234-5678",
        email: "zhang@example.com",
        group: "tokyo-2",
        referralSource: "客户推荐",
        location: "OVERSEAS",
        sourceType: "WEB",
        visaType: "student",
        referrerName: "佐藤様",
        avatar: "avatar.png",
        note: "updated",
        owner_user_id: "owner-2",
      },
    });
  });
});

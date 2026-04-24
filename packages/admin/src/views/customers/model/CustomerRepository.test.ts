import { describe, expect, it, vi } from "vitest";
import type { CustomerCreateFormFields } from "../types";
import {
  CustomerRepositoryError,
  createCustomerRepository,
} from "./CustomerRepository";

const CREATE_FIELDS: CustomerCreateFormFields = {
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
  avatar: "avatar.png",
  note: "prefer wechat",
};

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createRequestMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

describe("CustomerRepository", () => {
  it("lists customers with auth header and query params", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe(
        "/api/customers?scope=group&search=%E5%BC%A0%E4%BC%9F&page=2&limit=20",
      );
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });

      return jsonResponse({
        total: 1,
        items: [
          {
            id: "cust-001",
            displayName: "张伟（就劳）",
            legalName: "张伟",
            furigana: "チョウ イ",
            customerNumber: "CUS-001",
            phone: "090-1234-5678",
            email: "zhang@example.com",
            totalCases: 2,
            activeCases: 1,
            lastContactDate: null,
            lastContactChannel: null,
            owner: { initials: "ZW", name: "张顾问" },
            referralSource: "客户推荐",
            group: "东京一组",
            bmvProfile: null,
          },
        ],
      });
    });
    const repository = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    const result = await repository.listCustomers({
      scope: "group",
      search: "张伟",
      page: 2,
      limit: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe("cust-001");
  });

  it("lists related cases with customerId filter", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases?customerId=cust-001");
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });

      return jsonResponse({
        total: 1,
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
        ],
      });
    });
    const repository = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(repository.listRelatedCases("cust-001")).resolves.toEqual([
      {
        id: "case-001",
        name: "技人国更新",
        type: "visa-change",
        stage: "补件中",
        status: "active",
        owner: "owner-1",
        createdAt: "2026-04-01",
        updatedAt: "2026-04-10",
      },
    ]);
  });

  it("lists relations with customerId filter", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/contact-persons?customerId=cust-001");
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });

      return jsonResponse({
        total: 1,
        items: [
          {
            id: "rel-001",
            name: "田中次郎",
            relationType: "representative",
            roleTitle: "法定代理人",
            phone: "090-9999-8888",
            email: "tanaka@example.com",
          },
        ],
      });
    });
    const repository = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(repository.listRelations("cust-001")).resolves.toEqual([
      {
        id: "rel-001",
        name: "田中次郎",
        kana: "",
        relationType: "agent",
        phone: "090-9999-8888",
        email: "tanaka@example.com",
        tags: ["法定代理人"],
        note: "",
      },
    ]);
  });

  it("gets customer detail and validates response payload", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input) => {
        expect(String(input)).toBe("/api/customers/cust-001");
        return jsonResponse({
          id: "cust-001",
          displayName: "张伟（就劳）",
          legalName: "张伟",
          furigana: "チョウ イ",
          customerNumber: "CUS-001",
          phone: "090-1234-5678",
          email: "zhang@example.com",
          totalCases: 2,
          activeCases: 1,
          lastContactDate: null,
          lastContactChannel: null,
          owner: { initials: "ZW", name: "张顾问" },
          referralSource: "客户推荐",
          group: "东京一组",
          bmvProfile: null,
          nationality: "中国",
          gender: "男",
          birthDate: "1991-03-14",
          avatar: "avatar.png",
          note: "prefer wechat",
          archivedCases: 1,
          caseNames: ["技人国更新"],
          lastCaseCreatedDate: "2026-04-01",
        });
      }),
    });

    const detail = await repository.getCustomerDetail("cust-001");
    expect(detail.nationality).toBe("中国");
    expect(detail.caseNames).toEqual(["技人国更新"]);
  });

  it("creates customer with mapped payload and returns id", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((_input, init) => {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual({
          Accept: "application/json",
          "Content-Type": "application/json",
        });
        expect(init?.body).toBe(
          JSON.stringify({
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
              avatar: "avatar.png",
              note: "prefer wechat",
            },
          }),
        );
        return jsonResponse({ id: "cust-001" });
      }),
    });

    await expect(repository.createCustomer(CREATE_FIELDS)).resolves.toEqual({
      id: "cust-001",
    });
  });

  it("creates relation with mapped payload and returns relation", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/contact-persons");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            customerId: "cust-001",
            name: "田中次郎",
            relationType: "parent",
            roleTitle: "父亲",
            phone: "090-1234-5678",
            email: "tanaka@example.com",
          }),
        );
        return jsonResponse({
          id: "rel-001",
          name: "田中次郎",
          relationType: "parent",
          roleTitle: "父亲",
          phone: "090-1234-5678",
          email: "tanaka@example.com",
        });
      }),
    });

    await expect(
      repository.createRelation({
        customerId: "cust-001",
        name: "田中次郎",
        relationType: "parent",
        roleTitle: "父亲",
        phone: "090-1234-5678",
        email: "tanaka@example.com",
      }),
    ).resolves.toEqual({
      id: "rel-001",
      name: "田中次郎",
      kana: "",
      relationType: "parent",
      phone: "090-1234-5678",
      email: "tanaka@example.com",
      tags: ["父亲"],
      note: "",
    });
  });

  it("updates relation with mapped payload and encoded id", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/contact-persons/rel%2F001");
        expect(init?.method).toBe("PATCH");
        expect(init?.body).toBe(
          JSON.stringify({
            customerId: "cust-001",
            name: "田中次郎（更新）",
            relationType: "other",
            roleTitle: "监护人",
            phone: "090-0000-0000",
            email: "updated@example.com",
          }),
        );
        return jsonResponse({
          id: "rel/001",
          name: "田中次郎（更新）",
          relationType: "other",
          roleTitle: "监护人",
          phone: "090-0000-0000",
          email: "updated@example.com",
        });
      }),
    });

    await expect(
      repository.updateRelation("rel/001", {
        customerId: "cust-001",
        name: "田中次郎（更新）",
        relationType: "other",
        roleTitle: "监护人",
        phone: "090-0000-0000",
        email: "updated@example.com",
      }),
    ).resolves.toEqual({
      id: "rel/001",
      name: "田中次郎（更新）",
      kana: "",
      relationType: "other",
      phone: "090-0000-0000",
      email: "updated@example.com",
      tags: ["监护人"],
      note: "",
    });
  });

  it("maps duplicate-check response to duplicate candidates", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/customers/check-duplicates");
        expect(init?.body).toBe(
          JSON.stringify({
            name: "张伟",
            phone: "090-1234-5678",
            email: "zhang@example.com",
            excludeCustomerId: undefined,
          }),
        );
        return jsonResponse([
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
            matchedFields: ["name", "phone"],
          },
        ]);
      }),
    });

    const result = await repository.checkDuplicates({
      name: "张伟",
      phone: "090-1234-5678",
      email: "zhang@example.com",
    });

    expect(result).toEqual([
      {
        id: "cust-001",
        displayName: "张伟（就劳）",
        legalName: "张伟",
        furigana: "チョウ イ",
        phone: "090-1234-5678",
        email: "zhang@example.com",
        group: "tokyo-1",
        matchedFields: ["name", "phone"],
      },
    ]);
  });

  it("returns updated count for bulk actions", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/customers/bulk-assign-owner");
        expect(init?.body).toBe(
          JSON.stringify({
            customerIds: ["cust-001", "cust-002"],
            ownerId: "owner-1",
          }),
        );
        return jsonResponse({ ok: true, updatedCount: 2 });
      }),
    });

    await expect(
      repository.bulkAssignOwner(
        ["cust-001", "cust-002", "cust-001"],
        "owner-1",
      ),
    ).resolves.toEqual({ updatedCount: 2 });
  });

  it("maps 400 responses to validation errors", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock(() =>
        jsonResponse({ message: "Invalid baseProfile" }, { status: 400 }),
      ),
    });

    await expect(
      repository.createCustomer(CREATE_FIELDS),
    ).rejects.toMatchObject({
      name: "CustomerRepositoryError",
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Invalid baseProfile",
    } satisfies Partial<CustomerRepositoryError>);
  });

  it("throws validation error before request when bulk input is empty", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ ok: true, updatedCount: 1 }),
    );
    const repository = createCustomerRepository({ request });

    await expect(
      repository.bulkChangeGroup([], "tokyo-1"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "customerIds must contain at least one id",
    });
    expect(request).not.toHaveBeenCalled();
  });
});

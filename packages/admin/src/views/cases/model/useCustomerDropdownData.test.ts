import { describe, expect, it, vi } from "vitest";
import {
  useCustomerDropdownData,
  adaptCustomerDropdownItem,
  adaptCustomerDropdownList,
} from "./useCustomerDropdownData";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function stubFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(jsonResponse(body, status));
}

const VALID_ITEMS = {
  items: [
    {
      id: "c-1",
      displayName: "田中太郎",
      furigana: "タナカ タロウ",
      email: "tanaka@example.com",
      phone: "090-1111-1111",
      group: "tokyo-1",
    },
    {
      id: "c-2",
      displayName: "佐藤花子",
      furigana: "サトウ ハナコ",
      email: "sato@example.com",
      phone: "",
      group: "osaka-1",
      bmvProfile: {
        questionnaireStatus: "completed",
        quoteStatus: null,
        signStatus: null,
        intakeStatus: null,
      },
    },
  ],
  total: 2,
};

describe("adaptCustomerDropdownItem", () => {
  it("returns null for non-object input", () => {
    expect(adaptCustomerDropdownItem(null)).toBeNull();
    expect(adaptCustomerDropdownItem("string")).toBeNull();
  });

  it("returns null when id is missing", () => {
    expect(adaptCustomerDropdownItem({ displayName: "Test" })).toBeNull();
  });

  it("returns null when name is missing", () => {
    expect(adaptCustomerDropdownItem({ id: "1" })).toBeNull();
  });

  it("adapts a valid item", () => {
    const result = adaptCustomerDropdownItem(VALID_ITEMS.items[0]);
    expect(result).toEqual({
      id: "c-1",
      name: "田中太郎",
      kana: "タナカ タロウ",
      group: "tokyo-1",
      groupLabel: "tokyo-1",
      roleHint: "主申請人",
      summary: "",
      contact: "tanaka@example.com / 090-1111-1111",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: null,
      bmvIntakeStatus: null,
    });
  });

  it("falls back to legalName when displayName is empty", () => {
    const result = adaptCustomerDropdownItem({
      id: "c-3",
      legalName: "Legal Co.",
    });
    expect(result?.name).toBe("Legal Co.");
  });

  it("preserves BMV profile fields", () => {
    const result = adaptCustomerDropdownItem(VALID_ITEMS.items[1]);
    expect(result?.bmvQuestionnaireStatus).toBe("completed");
  });
});

describe("adaptCustomerDropdownList", () => {
  it("returns null for non-object input", () => {
    expect(adaptCustomerDropdownList(null)).toBeNull();
  });

  it("returns null when items is not an array", () => {
    expect(adaptCustomerDropdownList({ items: "bad" })).toBeNull();
  });

  it("adapts valid list, skipping invalid items", () => {
    const body = {
      items: [...VALID_ITEMS.items, { broken: true }],
      total: 3,
    };
    const result = adaptCustomerDropdownList(body);
    expect(result).toHaveLength(2);
    expect(result![0].id).toBe("c-1");
  });

  it("returns empty array for empty list", () => {
    expect(adaptCustomerDropdownList({ items: [], total: 0 })).toEqual([]);
  });
});

describe("useCustomerDropdownData", () => {
  it("starts in idle state", () => {
    const dd = useCustomerDropdownData({
      request: stubFetch(VALID_ITEMS),
      getToken: () => "tok",
    });
    expect(dd.customers.value).toEqual([]);
    expect(dd.loading.value).toBe(false);
    expect(dd.error.value).toBeNull();
    expect(dd.loaded.value).toBe(false);
  });

  it("fetches customers from API", async () => {
    const request = stubFetch(VALID_ITEMS);
    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
    });

    await dd.fetch();

    expect(request).toHaveBeenCalledTimes(1);
    const [url, opts] = request.mock.calls[0];
    expect(url).toBe("/api/customers?scope=mine");
    expect(opts.headers.Authorization).toBe("Bearer tok");
    expect(dd.customers.value).toHaveLength(2);
    expect(dd.customers.value[0].name).toBe("田中太郎");
    expect(dd.loaded.value).toBe(true);
    expect(dd.error.value).toBeNull();
  });

  it("sets error on HTTP failure without falling back to fixtures", async () => {
    const request = stubFetch({ message: "forbidden" }, 403);
    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
    });

    await dd.fetch();

    expect(dd.error.value).toBeTruthy();
    expect(dd.customers.value).toEqual([]);
    expect(dd.loaded.value).toBe(false);
  });

  it("sets error on network failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Network down"));
    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
    });

    await dd.fetch();

    expect(dd.error.value).toBe("Network down");
    expect(dd.customers.value).toEqual([]);
  });

  it("sets error on invalid response format", async () => {
    const request = stubFetch({ unexpected: true });
    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
    });

    await dd.fetch();

    expect(dd.error.value).toBe("Invalid response format");
    expect(dd.customers.value).toEqual([]);
  });

  it("retry clears previous error and reloads", async () => {
    let callCount = 0;
    const request = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve(jsonResponse(VALID_ITEMS));
    });

    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
    });

    await dd.fetch();
    expect(dd.error.value).toBe("fail");

    await dd.fetch();
    expect(dd.error.value).toBeNull();
    expect(dd.customers.value).toHaveLength(2);
    expect(dd.loaded.value).toBe(true);
  });

  it("uses custom apiPath when provided", async () => {
    const request = stubFetch(VALID_ITEMS);
    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
      apiPath: "/custom/api",
    });

    await dd.fetch();

    expect(request.mock.calls[0][0]).toBe("/custom/api?scope=mine");
  });

  it("omits Authorization header when token is null", async () => {
    const request = stubFetch(VALID_ITEMS);
    const dd = useCustomerDropdownData({
      request,
      getToken: () => null,
    });

    await dd.fetch();

    expect(request.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});

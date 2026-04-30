import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
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
      roleHint: "cases.create.step2.primaryRole",
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

// ─── BUG-139 — locale-aware groupLabel resolution ───────────────
//
// `useCustomerDropdownData.adaptItem` 历史上把 raw `group`（catalog id 或
// 服务端 UUID）直接当 label 透传，导致建案向导主申请人下拉直显 36 字符
// UUID。修复后传入 locale 时通过 `resolveGroupLabel` 走运行期别名表 +
// catalog 翻译，保持 R11 BUG-136 的修复增量延伸到 case 链路。
const SAMPLE_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

describe("adaptCustomerDropdownItem — BUG-139 locale-aware groupLabel", () => {
  beforeEach(() => {
    clearGroupAliases();
  });
  afterEach(() => {
    clearGroupAliases();
  });

  it("returns localized catalog label when locale is provided for catalog id", () => {
    const result = adaptCustomerDropdownItem(VALID_ITEMS.items[0], "zh-CN");
    expect(result?.groupLabel).toBe("东京一组");
  });

  it("translates UUID via alias map to localized catalog label", () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const result = adaptCustomerDropdownItem(
      { ...VALID_ITEMS.items[0], group: SAMPLE_UUID },
      "zh-CN",
    );
    expect(result?.groupLabel).toBe("东京一组");
    expect(result?.group).toBe(SAMPLE_UUID);
  });

  it("hides raw UUID with `—` placeholder when alias is missing", () => {
    const result = adaptCustomerDropdownItem(
      { ...VALID_ITEMS.items[0], group: SAMPLE_UUID },
      "zh-CN",
    );
    expect(result?.groupLabel).toBe("—");
    expect(result?.groupLabel).not.toContain(SAMPLE_UUID);
  });

  it("falls back to alias name when alias points outside catalog", () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "MyCustomGroup" }]);
    const result = adaptCustomerDropdownItem(
      { ...VALID_ITEMS.items[0], group: SAMPLE_UUID },
      "zh-CN",
    );
    expect(result?.groupLabel).toBe("MyCustomGroup");
  });

  it("preserves legacy raw passthrough when no locale is provided", () => {
    const result = adaptCustomerDropdownItem({
      ...VALID_ITEMS.items[0],
      group: SAMPLE_UUID,
    });
    expect(result?.groupLabel).toBe(SAMPLE_UUID);
  });
});

describe("useCustomerDropdownData — BUG-139 locale getter wiring", () => {
  beforeEach(() => {
    clearGroupAliases();
  });
  afterEach(() => {
    clearGroupAliases();
  });

  it("translates UUID groupLabel through locale getter at fetch time", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const request = stubFetch({
      items: [{ id: "c-9", displayName: "R12 应试客户", group: SAMPLE_UUID }],
      total: 1,
    });
    const dd = useCustomerDropdownData({
      request,
      getToken: () => "tok",
      locale: () => "zh-CN",
    });

    await dd.fetch();

    expect(dd.customers.value).toHaveLength(1);
    expect(dd.customers.value[0].group).toBe(SAMPLE_UUID);
    expect(dd.customers.value[0].groupLabel).toBe("东京一组");
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

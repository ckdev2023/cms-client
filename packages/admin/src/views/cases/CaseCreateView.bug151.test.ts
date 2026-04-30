import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import ArcoVue from "@arco-design/web-vue";
import CaseCreateView from "./CaseCreateView.vue";
import CaseCreateStep4 from "./components/CaseCreateStep4.vue";
import { i18n, setAppLocale, type AppLocale } from "../../i18n";

/**
 * BUG-151 回归：建案向导 Step 4 复核区 `收费金额` cell 必须以 `¥{n,千分位}` 渲染，
 * 不能直接透传 raw 数字字符串（例如 `"180000"`）。
 *
 * 三语下都应包含 `¥` 前缀与英文逗号千分位（与 `BillingSummaryCards.formatJPY` 对齐）。
 */

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/cases/create", name: "case-create", component: CaseCreateView },
    ],
  });

  await router.push({ name: "case-create" });
  await router.isReady();

  const wrapper = mount(CaseCreateView, {
    global: {
      plugins: [i18n, router, ArcoVue],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  });

  await flushPromises();
  return wrapper;
}

function readAmountSummary(wrapper: ReturnType<typeof mount>): string {
  const step4 = wrapper.findComponent(CaseCreateStep4);
  const summaryItems = step4.props("summaryItems") as Array<{
    label: string;
    value: string;
  }>;
  return summaryItems[summaryItems.length - 1].value;
}

async function typeAmount(
  wrapper: Awaited<ReturnType<typeof mountView>>,
  raw: string,
): Promise<void> {
  const inputs = wrapper.findAll("input.cc__input");
  const amountInput = inputs.find((i) =>
    (i.attributes("placeholder") ?? "").includes("150,000"),
  );
  if (!amountInput) {
    throw new Error("Could not locate Step 3 amount input by placeholder");
  }
  await amountInput.setValue(raw);
  await flushPromises();
}

describe("CaseCreateView BUG-151 review amount cell formatting", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each<[AppLocale, string, string]>([
    ["zh-CN", "180000", "¥180,000"],
    ["en-US", "180000", "¥180,000"],
    ["ja-JP", "180000", "¥180,000"],
    ["zh-CN", "1234567", "¥1,234,567"],
  ])(
    "%s formats raw amount %s as %s in Step 4 summary",
    async (locale, raw, formatted) => {
      setAppLocale(locale);
      const wrapper = await mountView();

      await typeAmount(wrapper, raw);

      expect(readAmountSummary(wrapper)).toBe(formatted);
      expect(readAmountSummary(wrapper)).not.toBe(raw);
    },
  );

  it("falls back to localized notSet when amount is empty", async () => {
    const cases: Array<[AppLocale, string]> = [
      ["zh-CN", "未设定"],
      ["en-US", "Not set"],
      ["ja-JP", "未設定"],
    ];
    for (const [locale, expected] of cases) {
      setAppLocale(locale);
      const wrapper = await mountView();
      expect(readAmountSummary(wrapper)).toBe(expected);
      wrapper.unmount();
    }
  });

  it("strips pre-existing thousands separators when the user pastes a formatted value", async () => {
    setAppLocale("zh-CN");
    const wrapper = await mountView();

    await typeAmount(wrapper, "180,000");

    expect(readAmountSummary(wrapper)).toBe("¥180,000");
  });
});

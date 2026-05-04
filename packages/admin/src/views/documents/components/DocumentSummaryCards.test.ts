import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_DOCUMENT_LIST, deriveDocumentSummaryCards } from "../fixtures";
import DocumentSummaryCards from "./DocumentSummaryCards.vue";

function mountCards() {
  return mount(DocumentSummaryCards, {
    props: {
      cards: deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST),
    },
    global: {
      plugins: [i18n],
    },
  });
}

function getHintTexts(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll(".doc-summary-card__hint").map((node) => node.text());
}

function getMissingHintEl(wrapper: ReturnType<typeof mount>) {
  const cards = wrapper.findAll(".doc-summary-card");
  const missingCard = cards.find((c) =>
    c.classes().includes("doc-summary-card--warning"),
  );
  return missingCard?.find(".doc-summary-card__hint");
}

describe("DocumentSummaryCards", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("uses the same expired terminology in zh-CN summary cards", () => {
    const wrapper = mountCards();
    const hints = getHintTexts(wrapper);

    expect(hints).toContain("过期");
    expect(hints).toContain("共享版本过期风险");
    expect(hints).not.toContain("已过期");
  });

  it("shows '缺件 / 待登记' for missing card in zh-CN", () => {
    const wrapper = mountCards();
    const hints = getHintTexts(wrapper);

    expect(hints).toContain("缺件 / 待登记");
    expect(hints).not.toContain("缺件");
  });

  it("renders missingTooltip on the missing hint in zh-CN", () => {
    const wrapper = mountCards();
    const hint = getMissingHintEl(wrapper);

    expect(hint?.attributes("title")).toBe(
      "包含状态：缺件、已驳回；不含已上传待审核",
    );
  });

  it("shows 'Missing or Pending' with tooltip in en-US", () => {
    setAppLocale("en-US");
    const wrapper = mountCards();
    const hints = getHintTexts(wrapper);

    expect(hints).toContain("Missing or Pending");

    const hint = getMissingHintEl(wrapper);
    expect(hint?.attributes("title")).toBe(
      "Includes statuses: pending, rejected; excludes uploaded pending review",
    );
  });

  it("localizes summary hints in ja-JP", () => {
    setAppLocale("ja-JP");
    const wrapper = mountCards();
    const hints = getHintTexts(wrapper);

    expect(hints).toEqual([
      "審査待ち",
      "不足・未登録",
      "期限切れ",
      "共有バージョン期限切れリスク",
    ]);
    expect(hints).not.toContain("待审核");
  });

  it("renders missingTooltip on the missing hint in ja-JP", () => {
    setAppLocale("ja-JP");
    const wrapper = mountCards();
    const hint = getMissingHintEl(wrapper);

    expect(hint?.attributes("title")).toBe(
      "含まれるステータス：未提出・差し戻し；審査待ちは含みません",
    );
  });

  it("does not render tooltip on non-missing cards", () => {
    const wrapper = mountCards();
    const cards = wrapper.findAll(".doc-summary-card");

    for (const card of cards) {
      if (card.classes().includes("doc-summary-card--warning")) continue;
      const hint = card.find(".doc-summary-card__hint");
      expect(hint.attributes("title")).toBeUndefined();
    }
  });
});

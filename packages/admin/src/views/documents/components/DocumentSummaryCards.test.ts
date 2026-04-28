import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_DOCUMENT_LIST, deriveDocumentSummaryCards } from "../fixtures";
import DocumentSummaryCards from "./DocumentSummaryCards.vue";

describe("DocumentSummaryCards", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("uses the same expired terminology in zh-CN summary cards", () => {
    const wrapper = mount(DocumentSummaryCards, {
      props: {
        cards: deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST),
      },
      global: {
        plugins: [i18n],
      },
    });

    const hints = wrapper
      .findAll(".doc-summary-card__hint")
      .map((node) => node.text());

    expect(hints).toContain("过期");
    expect(hints).toContain("共享版本过期风险");
    expect(hints).not.toContain("已过期");
  });

  it("localizes summary hints in ja-JP", () => {
    setAppLocale("ja-JP");

    const wrapper = mount(DocumentSummaryCards, {
      props: {
        cards: deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST),
      },
      global: {
        plugins: [i18n],
      },
    });

    const hints = wrapper
      .findAll(".doc-summary-card__hint")
      .map((node) => node.text());

    expect(hints).toEqual([
      "審査待ち",
      "不足",
      "期限切れ",
      "共有バージョン期限切れリスク",
    ]);
    expect(hints).not.toContain("待审核");
  });
});

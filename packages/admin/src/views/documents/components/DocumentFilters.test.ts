import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { deriveCaseOptions, SAMPLE_DOCUMENT_LIST } from "../fixtures";
import DocumentFilters from "./DocumentFilters.vue";

describe("DocumentFilters", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("localizes status and provider options in ja-JP", () => {
    setAppLocale("ja-JP");

    const wrapper = mount(DocumentFilters, {
      props: {
        caseOptions: deriveCaseOptions(SAMPLE_DOCUMENT_LIST),
        filteredCount: SAMPLE_DOCUMENT_LIST.length,
      },
      global: {
        plugins: [i18n],
        stubs: {
          SearchField: true,
          Button: true,
        },
      },
    });

    const statusOptions = wrapper
      .findAll("select")[0]
      .findAll("option")
      .map((node) => node.text());
    const providerOptions = wrapper
      .findAll("select")[2]
      .findAll("option")
      .map((node) => node.text());

    expect(statusOptions).toContain("審査待ち");
    expect(statusOptions).toContain("承認済み");
    expect(statusOptions).toContain("差し戻し");
    expect(statusOptions).not.toContain("待审核");
    expect(statusOptions).not.toContain("已通过");
    expect(statusOptions).not.toContain("已拒绝");

    expect(providerOptions).toContain("主申請者");
    expect(providerOptions).toContain("受入機関・企業担当");
    expect(providerOptions).not.toContain("主申请人");
  });
});

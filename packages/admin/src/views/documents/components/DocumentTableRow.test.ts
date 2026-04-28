import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_DOCUMENT_LIST } from "../fixtures";
import DocumentTableRow from "./DocumentTableRow.vue";

describe("DocumentTableRow", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("keeps expired row terminology consistent in zh-CN", () => {
    const wrapper = mount(DocumentTableRow, {
      props: {
        item: SAMPLE_DOCUMENT_LIST.find((item) => item.status === "expired")!,
      },
      global: {
        plugins: [i18n],
      },
    });

    expect(wrapper.text()).toContain("过期");
    expect(wrapper.text()).not.toContain("已过期");
  });

  it("localizes provider and status badge in ja-JP", () => {
    setAppLocale("ja-JP");

    const wrapper = mount(DocumentTableRow, {
      props: {
        item: SAMPLE_DOCUMENT_LIST[0],
      },
      global: {
        plugins: [i18n],
      },
    });

    expect(wrapper.text()).toContain("主申請者");
    expect(wrapper.text()).toContain("審査待ち");
    expect(wrapper.text()).not.toContain("主申请人");
    expect(wrapper.text()).not.toContain("待审核");
  });
});

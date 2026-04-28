import { afterEach, describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import PageHeader from "./PageHeader.vue";

function createTestI18n(locale: "zh-CN" | "en-US" = "en-US") {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      "zh-CN": { shared: { breadcrumbsLabel: "面包屑导航" } },
      "en-US": { shared: { breadcrumbsLabel: "Breadcrumb navigation" } },
    },
  });
}

function mountPageHeader(
  options: Parameters<typeof mount<typeof PageHeader>>[1] = {},
  locale: "zh-CN" | "en-US" = "en-US",
) {
  return mount(PageHeader, {
    global: { plugins: [createTestI18n(locale)] },
    ...options,
  });
}

describe("PageHeader", () => {
  afterEach(() => undefined);

  it("renders the title", () => {
    const w = mountPageHeader({ props: { title: "案件" } });
    expect(w.find(".ui-page-header__title").text()).toBe("案件");
  });

  it("renders subtitle when provided", () => {
    const w = mountPageHeader({
      props: { title: "T", subtitle: "Sub" },
    });
    expect(w.find(".ui-page-header__subtitle").text()).toBe("Sub");
  });

  it("does not render subtitle when absent", () => {
    const w = mountPageHeader({ props: { title: "T" } });
    expect(w.find(".ui-page-header__subtitle").exists()).toBe(false);
  });

  it("renders breadcrumbs with separator", () => {
    const w = mountPageHeader({
      props: {
        title: "Detail",
        breadcrumbs: [{ label: "案件", href: "/cases" }, { label: "CAS-001" }],
      },
    });
    const crumbs = w.findAll(".ui-page-header__crumb");
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0].element.tagName).toBe("A");
    expect(crumbs[0].attributes("href")).toBe("/cases");
    expect(crumbs[1].element.tagName).toBe("SPAN");
    expect(crumbs[1].attributes("aria-current")).toBe("page");
    expect(w.find(".ui-page-header__sep").exists()).toBe(true);
  });

  it("localizes breadcrumb aria-label", () => {
    const w = mountPageHeader(
      {
        props: {
          title: "Detail",
          breadcrumbs: [
            { label: "案件", href: "/cases" },
            { label: "CAS-001" },
          ],
        },
      },
      "zh-CN",
    );
    expect(
      w.find(".ui-page-header__breadcrumbs").attributes("aria-label"),
    ).toBe("面包屑导航");
  });

  it("does not render breadcrumbs nav when none provided", () => {
    const w = mountPageHeader({ props: { title: "T" } });
    expect(w.find(".ui-page-header__breadcrumbs").exists()).toBe(false);
  });

  it("renders actions slot", () => {
    const w = mountPageHeader({
      props: { title: "T" },
      slots: { actions: "<button>Add</button>" },
    });
    expect(w.find(".ui-page-header__actions").exists()).toBe(true);
    expect(w.find(".ui-page-header__actions").text()).toBe("Add");
  });

  it("does not render actions area without slot", () => {
    const w = mountPageHeader({ props: { title: "T" } });
    expect(w.find(".ui-page-header__actions").exists()).toBe(false);
  });

  it("renders badge slot next to title", () => {
    const w = mountPageHeader({
      props: { title: "Case" },
      slots: { badge: "<span class='b'>Active</span>" },
    });
    const titleRow = w.find(".ui-page-header__title-row");
    expect(titleRow.find(".b").exists()).toBe(true);
  });

  it("renders meta slot below title", () => {
    const w = mountPageHeader({
      props: { title: "Case" },
      slots: { meta: "<span class='m'>info</span>" },
    });
    expect(w.find(".ui-page-header__left .m").exists()).toBe(true);
  });

  it("uses header element as root", () => {
    const w = mountPageHeader({ props: { title: "T" } });
    expect(w.element.tagName).toBe("HEADER");
  });
});

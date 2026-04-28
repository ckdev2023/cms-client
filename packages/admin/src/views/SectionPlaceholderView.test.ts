import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createMemoryHistory, createRouter } from "vue-router";
import SectionPlaceholderView from "./SectionPlaceholderView.vue";

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: {
      "zh-CN": {
        shared: { breadcrumbsLabel: "面包屑导航" },
        shell: {
          nav: {
            items: { dashboard: "仪表盘", tasks: "任务与提醒" },
            groups: { business: "业务" },
          },
        },
        sectionPlaceholder: {
          subtitle: "{section} 占位页",
          badge: "建设中",
          cardTitle: "说明",
          description: "{section} 说明",
          pathLabel: "路径",
        },
      },
    },
  });
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/tasks",
        component: SectionPlaceholderView,
        meta: { navKey: "tasks", groupKey: "business" },
      },
    ],
  });
  await router.push("/tasks");
  await router.isReady();
  return mount(SectionPlaceholderView, {
    global: {
      plugins: [makeI18n(), router],
      stubs: {
        Card: { template: "<div><slot /></div>" },
        Chip: { template: "<span><slot /></span>" },
      },
    },
  });
}

describe("SectionPlaceholderView", () => {
  beforeEach(() => undefined);

  it("uses hash-based dashboard breadcrumb href for tasks", async () => {
    const w = await mountView();
    const dashboardCrumb = w.find(".ui-page-header__crumb--link");
    expect(dashboardCrumb.text()).toBe("仪表盘");
    expect(dashboardCrumb.attributes("href")).toBe("#/");
  });
});

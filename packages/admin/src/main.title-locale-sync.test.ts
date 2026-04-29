import { describe, it, expect, beforeEach } from "vitest";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { setAppLocale } from "./i18n";
import { applyDocumentTitle, setupTitleSync } from "./titleSync";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        component: { template: "<div />" },
        meta: { titleKey: "shell.nav.items.dashboard" },
      },
      {
        path: "/tasks",
        component: { template: "<div />" },
        meta: { titleKey: "shell.nav.items.tasks" },
      },
      {
        path: "/cases",
        component: { template: "<div />" },
        meta: { titleKey: "shell.nav.items.cases" },
      },
      {
        path: "/plain",
        component: { template: "<div />" },
        meta: { title: "Static Title" },
      },
      {
        path: "/bare",
        component: { template: "<div />" },
        meta: {},
      },
    ],
  });
}

describe("document.title locale sync", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    document.title = "";
  });

  it("resolves titleKey via i18n for zh-CN", () => {
    applyDocumentTitle({ meta: { titleKey: "shell.nav.items.tasks" } });
    expect(document.title).toBe("任务与提醒 - Gyosei OS");
  });

  it("resolves titleKey via i18n for ja-JP", () => {
    setAppLocale("ja-JP");
    applyDocumentTitle({ meta: { titleKey: "shell.nav.items.tasks" } });
    expect(document.title).toBe("タスク・リマインド - Gyosei OS");
  });

  it("resolves titleKey via i18n for en-US", () => {
    setAppLocale("en-US");
    applyDocumentTitle({ meta: { titleKey: "shell.nav.items.tasks" } });
    expect(document.title).toBe("Tasks & reminders - Gyosei OS");
  });

  it("uses static title when meta.title is provided", () => {
    applyDocumentTitle({ meta: { title: "Static Title" } });
    expect(document.title).toBe("Static Title - Gyosei OS");
  });

  it("falls back to app title when no titleKey or title", () => {
    applyDocumentTitle({ meta: {} });
    expect(document.title).toBe("Gyosei OS");
  });

  it("prefers meta.title over titleKey when both are present", () => {
    applyDocumentTitle({
      meta: { title: "Explicit", titleKey: "shell.nav.items.tasks" },
    });
    expect(document.title).toBe("Explicit - Gyosei OS");
  });

  it("updates document.title when locale changes via watch", async () => {
    const router = makeRouter();
    setupTitleSync(router);

    await router.push("/tasks");
    await router.isReady();

    expect(document.title).toBe("任务与提醒 - Gyosei OS");

    setAppLocale("ja-JP");
    await nextTick();

    expect(document.title).toBe("タスク・リマインド - Gyosei OS");
  });

  it("updates document.title on route navigation", async () => {
    const router = makeRouter();
    setupTitleSync(router);

    await router.push("/tasks");
    expect(document.title).toBe("任务与提醒 - Gyosei OS");

    await router.push("/cases");
    expect(document.title).toBe("案件 - Gyosei OS");
  });

  it("switches from zh-CN to en-US and back", async () => {
    const router = makeRouter();
    setupTitleSync(router);

    await router.push("/tasks");
    expect(document.title).toBe("任务与提醒 - Gyosei OS");

    setAppLocale("en-US");
    await nextTick();
    expect(document.title).toBe("Tasks & reminders - Gyosei OS");

    setAppLocale("zh-CN");
    await nextTick();
    expect(document.title).toBe("任务与提醒 - Gyosei OS");
  });

  it("shows plain app title for route without titleKey or title", async () => {
    const router = makeRouter();
    setupTitleSync(router);

    await router.push("/bare");
    expect(document.title).toBe("Gyosei OS");

    setAppLocale("ja-JP");
    await nextTick();
    expect(document.title).toBe("Gyosei OS");
  });
});

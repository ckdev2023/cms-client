import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseTasksTab from "./CaseTasksTab.vue";
import type { CaseDetail, TaskItem } from "../types-detail";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": { cases: casesZhCN } },
  });
}

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    label: "起草申请理由书",
    done: false,
    status: "pending",
    due: "04/20",
    assignee: "TN",
    color: "success",
    dueColor: "danger",
    ...overrides,
  };
}

function makeDetail(tasks: TaskItem[], readonly = false): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    tasks,
    readonly,
  };
}

function mountTab(opts: { tasks?: TaskItem[]; readonly?: boolean } = {}) {
  const tasks = opts.tasks ?? [makeTask()];
  const readonly = opts.readonly ?? false;
  return mount(CaseTasksTab, {
    props: {
      detail: makeDetail(tasks, readonly),
      readonly,
    },
    global: {
      plugins: [makeI18n()],
      stubs: { Card: CARD_STUB },
    },
  });
}

describe("CaseTasksTab — complete-task emit", () => {
  it("clicking a pending task checkbox emits complete-task with the task id", async () => {
    const w = mountTab({ tasks: [makeTask({ id: "task-abc" })] });
    const btn = w.find("button[role='checkbox']");
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    expect(w.emitted("complete-task")).toEqual([["task-abc"]]);
  });

  it("clicking an already-done task checkbox does NOT emit complete-task", async () => {
    const w = mountTab({
      tasks: [makeTask({ id: "task-done", done: true, status: "completed" })],
    });
    const btn = w.find("button[role='checkbox']");
    await btn.trigger("click");
    expect(w.emitted("complete-task")).toBeUndefined();
  });

  it("emits with the correct id when multiple tasks exist", async () => {
    const tasks = [
      makeTask({ id: "t-1", label: "Task A", done: false }),
      makeTask({ id: "t-2", label: "Task B", done: false }),
      makeTask({ id: "t-3", label: "Task C", done: true, status: "completed" }),
    ];
    const w = mountTab({ tasks });
    const buttons = w.findAll("button[role='checkbox']");
    expect(buttons).toHaveLength(3);

    await buttons[1].trigger("click");
    expect(w.emitted("complete-task")).toEqual([["t-2"]]);
  });
});

describe("CaseTasksTab — readonly prevents interaction", () => {
  it("checkbox buttons are disabled in readonly mode", () => {
    const w = mountTab({
      tasks: [makeTask({ done: false })],
      readonly: true,
    });
    const btn = w.find("button[role='checkbox']");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("clicking checkbox in readonly mode does NOT emit complete-task", async () => {
    const w = mountTab({
      tasks: [makeTask({ done: false })],
      readonly: true,
    });
    const btn = w.find("button[role='checkbox']");
    await btn.trigger("click");
    expect(w.emitted("complete-task")).toBeUndefined();
  });

  it("add-task button is hidden in readonly mode", () => {
    const w = mountTab({
      tasks: [makeTask()],
      readonly: true,
    });
    const addBtns = w.findAll(".tasks-tab__add-link");
    expect(addBtns).toHaveLength(0);
  });
});

describe("CaseTasksTab — optimistic update via prop change", () => {
  it("checkbox shows done state when detail.tasks[n].done is toggled via prop", async () => {
    const task = makeTask({ id: "opt-1", done: false });
    const w = mountTab({ tasks: [task] });

    const btn = () => w.find("button[role='checkbox']");
    expect(btn().classes()).not.toContain("tasks-tab__checkbox--done");
    expect(btn().attributes("aria-checked")).toBe("false");

    await w.setProps({
      detail: makeDetail([{ ...task, done: true, status: "completed" }]),
    });

    expect(btn().classes()).toContain("tasks-tab__checkbox--done");
    expect(btn().attributes("aria-checked")).toBe("true");
  });

  it("task label gets strikethrough class when done", async () => {
    const task = makeTask({ id: "opt-2", done: false });
    const w = mountTab({ tasks: [task] });

    const label = () => w.find(".tasks-tab__label");
    expect(label().classes()).not.toContain("tasks-tab__label--done");

    await w.setProps({
      detail: makeDetail([{ ...task, done: true, status: "completed" }]),
    });
    expect(label().classes()).toContain("tasks-tab__label--done");
  });
});

describe("CaseTasksTab — error rollback via prop revert", () => {
  it("checkbox reverts to unchecked when parent rolls back the prop", async () => {
    const task = makeTask({ id: "rb-1", done: false });
    const w = mountTab({ tasks: [task] });
    const btn = () => w.find("button[role='checkbox']");

    expect(btn().attributes("aria-checked")).toBe("false");

    await w.setProps({
      detail: makeDetail([{ ...task, done: true, status: "completed" }]),
    });
    expect(btn().attributes("aria-checked")).toBe("true");

    await w.setProps({
      detail: makeDetail([{ ...task, done: false, status: "pending" }]),
    });
    expect(btn().attributes("aria-checked")).toBe("false");
    expect(btn().classes()).not.toContain("tasks-tab__checkbox--done");
  });

  it("task label class reverts on rollback", async () => {
    const task = makeTask({ id: "rb-2", done: false });
    const w = mountTab({ tasks: [task] });
    const label = () => w.find(".tasks-tab__label");

    await w.setProps({
      detail: makeDetail([{ ...task, done: true, status: "completed" }]),
    });
    expect(label().classes()).toContain("tasks-tab__label--done");

    await w.setProps({
      detail: makeDetail([{ ...task, done: false, status: "pending" }]),
    });
    expect(label().classes()).not.toContain("tasks-tab__label--done");
  });
});

describe("CaseTasksTab — aria attributes", () => {
  it("checkbox has correct aria-checked for pending task", () => {
    const w = mountTab({ tasks: [makeTask({ done: false })] });
    const btn = w.find("button[role='checkbox']");
    expect(btn.attributes("aria-checked")).toBe("false");
  });

  it("checkbox has correct aria-checked for completed task", () => {
    const w = mountTab({
      tasks: [makeTask({ done: true, status: "completed" })],
    });
    const btn = w.find("button[role='checkbox']");
    expect(btn.attributes("aria-checked")).toBe("true");
  });

  it("checkbox has aria-label matching task label", () => {
    const w = mountTab({
      tasks: [makeTask({ label: "催办护照" })],
    });
    const btn = w.find("button[role='checkbox']");
    expect(btn.attributes("aria-label")).toBe("催办护照");
  });
});

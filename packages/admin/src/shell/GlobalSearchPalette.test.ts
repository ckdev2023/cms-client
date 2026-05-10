import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { i18n, setAppLocale } from "../i18n";
import GlobalSearchPalette from "./GlobalSearchPalette.vue";
import type { SearchHit } from "../shared/api/searchRepository";
import type { SearchGroup } from "./useGlobalSearch";

Element.prototype.scrollIntoView = vi.fn();

const stubs = {
  NavIcon: { props: ["name"], template: "<span class='icon' />" },
};

function makeGroups(hits: SearchHit[]): SearchGroup[] {
  const map = new Map<string, SearchHit[]>();
  for (const h of hits) {
    const bucket = map.get(h.type) ?? [];
    bucket.push(h);
    map.set(h.type, bucket);
  }
  return Array.from(map.entries()).map(([type, items]) => ({
    type: type as SearchHit["type"],
    hits: items,
  }));
}

const SAMPLE_HITS: SearchHit[] = [
  { type: "customer", id: "c1", title: "田中太郎", href: "/customers/c1" },
  {
    type: "case",
    id: "cs1",
    title: "田中 経営管理",
    subtitle: "田中太郎",
    href: "/cases/cs1",
  },
  { type: "lead", id: "l1", title: "Michael", href: "/leads/l1" },
];

let wrapper: VueWrapper<any> | null = null;

function mountPalette(propsOverride: Record<string, unknown> = {}) {
  wrapper = mount(GlobalSearchPalette, {
    props: {
      open: true,
      groups: makeGroups(SAMPLE_HITS),
      flatHits: SAMPLE_HITS,
      highlightedIndex: 0,
      loading: false,
      query: "田中",
      ...propsOverride,
    },
    global: { plugins: [i18n], stubs },
    attachTo: document.body,
  });
  return wrapper;
}

function findDialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

describe("GlobalSearchPalette", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("renders dialog with role=dialog and aria-modal when open", async () => {
    mountPalette();
    await nextTick();
    const dialog = findDialog();
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.getAttribute("aria-label")).toBe("全局搜索");
  });

  it("does not render dialog when closed", async () => {
    mountPalette({ open: false });
    await nextTick();
    expect(findDialog()).toBeNull();
  });

  it("focuses input on open", async () => {
    const w = mountPalette({ open: false });
    await nextTick();
    await w.setProps({ open: true });
    await nextTick();
    await nextTick();
    const input = document.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    expect(input).toBe(document.activeElement);
  });

  it("emits update:open=false on Escape keydown", async () => {
    const w = mountPalette();
    await nextTick();
    const dialog = findDialog();
    expect(dialog).not.toBeNull();
    dialog!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    await flushPromises();
    await nextTick();
    expect(w.emitted("update:open")).toEqual([[false]]);
  });

  it("emits update:open=false on Escape when focus is outside the dialog", async () => {
    const w = mountPalette();
    await nextTick();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    await flushPromises();
    await nextTick();
    expect(w.emitted("update:open")).toEqual([[false]]);
    outside.remove();
  });

  it("emits moveHighlight(1) on ArrowDown", async () => {
    const w = mountPalette();
    await nextTick();
    const dialog = findDialog()!;
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    await nextTick();
    expect(w.emitted("moveHighlight")).toEqual([[1]]);
  });

  it("emits moveHighlight(-1) on ArrowUp", async () => {
    const w = mountPalette();
    await nextTick();
    const dialog = findDialog()!;
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );
    await nextTick();
    expect(w.emitted("moveHighlight")).toEqual([[-1]]);
  });

  it("emits select on Enter", async () => {
    const w = mountPalette();
    await nextTick();
    const dialog = findDialog()!;
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await nextTick();
    expect(w.emitted("select")).toEqual([[]]);
  });

  it("emits select with hit when list item is clicked", async () => {
    const w = mountPalette();
    await nextTick();
    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(3);
    (items[1] as HTMLElement).click();
    await nextTick();
    expect(w.emitted("select")).toEqual([[SAMPLE_HITS[1]]]);
  });

  it("emits update:open=false when backdrop is clicked", async () => {
    const w = mountPalette();
    await nextTick();
    const backdrop = document.querySelector(
      ".search-palette-backdrop",
    ) as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await nextTick();
    expect(w.emitted("update:open")).toEqual([[false]]);
  });

  it("highlights the correct item via aria-selected", async () => {
    mountPalette({ highlightedIndex: 1 });
    await nextTick();
    const items = document.querySelectorAll('[role="option"]');
    expect(items[0].getAttribute("aria-selected")).toBe("false");
    expect(items[1].getAttribute("aria-selected")).toBe("true");
    expect(items[2].getAttribute("aria-selected")).toBe("false");
  });

  it("shows loading state", async () => {
    mountPalette({ loading: true, flatHits: [], groups: [] });
    await nextTick();
    expect(document.querySelector(".search-palette-spinner")).not.toBeNull();
    expect(findDialog()!.textContent).toContain("搜索中…");
  });

  it("shows empty state when no hits and query present", async () => {
    mountPalette({ flatHits: [], groups: [], query: "nomatch" });
    await nextTick();
    expect(findDialog()!.textContent).toContain("没有找到结果");
  });

  it("shows error state instead of empty when error is set", async () => {
    mountPalette({
      flatHits: [],
      groups: [],
      query: "fail",
      error: "Network failure",
    });
    await nextTick();
    const errorEl = document.querySelector('[data-testid="search-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain("搜索失败，请稍后再试");
    expect(errorEl!.textContent).toContain("Network failure");
    expect(findDialog()!.textContent).not.toContain("没有找到结果");
  });

  it("shows placeholder hint when no query entered", async () => {
    mountPalette({ flatHits: [], groups: [], query: "" });
    await nextTick();
    expect(findDialog()!.textContent).toContain("搜索客户、案件、资料…");
  });

  it("renders group labels for each type", async () => {
    mountPalette();
    await nextTick();
    const labels = document.querySelectorAll(".search-palette-group-label");
    expect(labels.length).toBe(3);
    expect(labels[0].textContent!.trim()).toBe("客户");
    expect(labels[1].textContent!.trim()).toBe("案件");
    expect(labels[2].textContent!.trim()).toBe("咨询");
  });

  it("renders subtitle when present", async () => {
    mountPalette();
    await nextTick();
    const subtitles = document.querySelectorAll(
      ".search-palette-item-subtitle",
    );
    expect(subtitles.length).toBe(1);
    expect(subtitles[0].textContent).toBe("田中太郎");
  });

  it("emits update:query on input", async () => {
    const w = mountPalette();
    await nextTick();
    const input = document.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    const nativeInputEvent = new Event("input", { bubbles: true });
    Object.defineProperty(nativeInputEvent, "target", {
      value: { value: "新しい検索" },
    });
    input.value = "新しい検索";
    input.dispatchEvent(nativeInputEvent);
    await nextTick();
    expect(w.emitted("update:query")).toBeDefined();
    const lastEmission = w.emitted("update:query")!.at(-1);
    expect(lastEmission).toEqual(["新しい検索"]);
  });

  describe("focus trap", () => {
    async function mountAndOpenPalette() {
      const w = mountPalette({ open: false });
      await nextTick();
      await w.setProps({ open: true });
      await nextTick();
      await nextTick();
      return w;
    }

    it("traps Tab on last element back to first", async () => {
      await mountAndOpenPalette();

      const panel = findDialog()!;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      expect(focusables.length).toBeGreaterThan(0);

      const last = focusables[focusables.length - 1]!;
      last.focus();
      expect(document.activeElement).toBe(last);

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);
      await nextTick();

      expect(tabEvent.defaultPrevented).toBe(true);
    });

    it("traps Shift+Tab on first element back to last", async () => {
      await mountAndOpenPalette();

      const panel = findDialog()!;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0]!;
      first.focus();
      expect(document.activeElement).toBe(first);

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);
      await nextTick();

      expect(tabEvent.defaultPrevented).toBe(true);
    });

    it("cleans up focus trap listener when closed", async () => {
      const w = await mountAndOpenPalette();

      await w.setProps({ open: false });
      await nextTick();
      await nextTick();

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);
      expect(tabEvent.defaultPrevented).toBe(false);
    });
  });
});

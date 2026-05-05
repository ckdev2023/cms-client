import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { h, nextTick } from "vue";
import ResponsiveTable from "./ResponsiveTable.vue";
import type { ResponsiveColumn } from "./ResponsiveTable.vue";

type MQLListener = (e: MediaQueryListEvent) => void;

let mqlMatches = false;
let mqlListeners: MQLListener[] = [];
let matchMediaCalls: string[] = [];

function fireMqlChange(matches: boolean) {
  mqlMatches = matches;
  for (const fn of [...mqlListeners]) {
    fn({ matches } as MediaQueryListEvent);
  }
}

function installMatchMediaStub() {
  (window as any).matchMedia = (query: string) => {
    matchMediaCalls.push(query);
    return {
      matches: mqlMatches,
      media: query,
      addEventListener: (_: string, fn: MQLListener) => {
        mqlListeners.push(fn);
      },
      removeEventListener: (_: string, fn: MQLListener) => {
        mqlListeners = mqlListeners.filter((l) => l !== fn);
      },
      dispatchEvent: () => true,
    };
  };
}

beforeEach(() => {
  mqlMatches = false;
  mqlListeners = [];
  matchMediaCalls = [];
  installMatchMediaStub();
});

const COLS: ResponsiveColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email", hideAt: "md" },
  { key: "role", label: "Role", hideAt: "lg" },
];

const ROWS = [
  { id: 1, name: "Alice", email: "a@b.c", role: "Admin" },
  { id: 2, name: "Bob", email: "b@b.c", role: "User" },
];

function mountRT(
  overrideProps: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(ResponsiveTable, {
    props: {
      columns: COLS,
      rows: ROWS,
      rowKey: (r: any) => r.id,
      ...overrideProps,
    },
    slots: {
      default: '<div class="test-table">Desktop</div>',
      ...slots,
    },
  });
}

describe("ResponsiveTable", () => {
  describe("desktop mode (data-h5-mode=table)", () => {
    it("renders default slot and sets data-h5-mode=table", () => {
      const w = mountRT();
      expect(w.attributes("data-h5-mode")).toBe("table");
      expect(w.find(".test-table").exists()).toBe(true);
    });

    it("does not render mobile cards in desktop mode", () => {
      const w = mountRT();
      expect(w.find(".responsive-table__cards").exists()).toBe(false);
    });
  });

  describe("mobile mode (data-h5-mode=card)", () => {
    beforeEach(() => {
      mqlMatches = true;
      installMatchMediaStub();
    });

    it("renders card mode and sets data-h5-mode=card", () => {
      const w = mountRT();
      expect(w.attributes("data-h5-mode")).toBe("card");
      expect(w.find(".test-table").exists()).toBe(false);
      expect(w.find(".responsive-table__cards").exists()).toBe(true);
    });

    it("renders one card per row", () => {
      const w = mountRT();
      const cards = w.findAll(".responsive-table__card");
      expect(cards).toHaveLength(2);
    });

    it("renders default dl from columns when #mobile-card is absent", () => {
      const w = mountRT();
      const dts = w.findAll(".responsive-table__dt");
      expect(dts.map((d) => d.text())).toEqual([
        "Name",
        "Email",
        "Role",
        "Name",
        "Email",
        "Role",
      ]);
      const dds = w.findAll(".responsive-table__dd");
      expect(dds[0].text()).toBe("Alice");
      expect(dds[1].text()).toBe("a@b.c");
    });

    it("renders #mobile-card slot when provided", () => {
      const w = mountRT(
        {},
        {
          "mobile-card": (props: any) =>
            h("div", { class: "custom-card" }, props.row.name),
        },
      );
      const custom = w.findAll(".custom-card");
      expect(custom).toHaveLength(2);
      expect(custom[0].text()).toBe("Alice");
      expect(custom[1].text()).toBe("Bob");
    });

    it("renders #cell-{key} slots in default card", () => {
      const w = mountRT(
        {},
        {
          "cell-name": (props: any) =>
            h("strong", {}, props.row.name.toUpperCase()),
        },
      );
      const strongs = w.findAll("strong");
      expect(strongs).toHaveLength(2);
      expect(strongs[0].text()).toBe("ALICE");
    });

    it("renders #mobile-prepend slot before cards", () => {
      const w = mountRT(
        {},
        {
          "mobile-prepend": () => h("div", { class: "draft-area" }, "Drafts"),
        },
      );
      expect(w.find(".draft-area").exists()).toBe(true);
      const html = w.html();
      const draftIdx = html.indexOf("draft-area");
      const cardsIdx = html.indexOf("responsive-table__cards");
      expect(draftIdx).toBeLessThan(cardsIdx);
    });

    it("renders #empty slot when rows is empty", () => {
      const w = mountRT(
        { rows: [] },
        { empty: () => h("div", { class: "empty-msg" }, "No data") },
      );
      expect(w.find(".empty-msg").exists()).toBe(true);
      expect(w.find(".responsive-table__cards").exists()).toBe(false);
    });

    it("shows fallback dash for missing field values", () => {
      const w = mountRT({
        columns: [{ key: "x", label: "X" }],
        rows: [{ id: 1 }],
      });
      const dd = w.find(".responsive-table__dd");
      expect(dd.exists()).toBe(true);
      expect(dd.text()).toBe("\u2014");
    });
  });

  describe("mode switching", () => {
    it("switches from table to card on matchMedia change", async () => {
      mqlMatches = false;
      installMatchMediaStub();
      const w = mountRT();
      expect(w.attributes("data-h5-mode")).toBe("table");

      fireMqlChange(true);
      await nextTick();
      expect(w.attributes("data-h5-mode")).toBe("card");
      expect(w.find(".responsive-table__cards").exists()).toBe(true);
    });

    it("switches from card to table on matchMedia change", async () => {
      mqlMatches = true;
      installMatchMediaStub();
      const w = mountRT();
      expect(w.attributes("data-h5-mode")).toBe("card");

      fireMqlChange(false);
      await nextTick();
      expect(w.attributes("data-h5-mode")).toBe("table");
      expect(w.find(".test-table").exists()).toBe(true);
    });
  });

  describe("mobileBreakpoint prop", () => {
    it("uses 767px query for md breakpoint (default)", () => {
      mountRT();
      expect(matchMediaCalls[0]).toBe("(max-width: 767px)");
    });

    it("uses 639px query for sm breakpoint", () => {
      mountRT({ mobileBreakpoint: "sm" });
      expect(matchMediaCalls[0]).toBe("(max-width: 639px)");
    });
  });

  describe("exposes isMobile", () => {
    it("exposes isMobile ref", () => {
      const w = mountRT();
      expect(w.vm.isMobile).toBe(false);
    });
  });
});

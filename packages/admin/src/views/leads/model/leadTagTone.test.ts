import { describe, expect, it } from "vitest";
import { resolveTagTone } from "./leadTagTone";

describe("resolveTagTone", () => {
  describe("preset semantic tags", () => {
    it("VIP → primary", () => {
      expect(resolveTagTone("VIP")).toBe("primary");
    });
    it("vip (lowercase) → primary", () => {
      expect(resolveTagTone("vip")).toBe("primary");
    });
    it("urgent → warning", () => {
      expect(resolveTagTone("urgent")).toBe("warning");
    });
    it("優先 → warning", () => {
      expect(resolveTagTone("優先")).toBe("warning");
    });
    it("优先 → warning", () => {
      expect(resolveTagTone("优先")).toBe("warning");
    });
    it("急 → warning", () => {
      expect(resolveTagTone("急")).toBe("warning");
    });
    it("面談済 → success", () => {
      expect(resolveTagTone("面談済")).toBe("success");
    });
    it("面谈过 → success", () => {
      expect(resolveTagTone("面谈过")).toBe("success");
    });
    it("已签约 → success", () => {
      expect(resolveTagTone("已签约")).toBe("success");
    });
    it("signed → success", () => {
      expect(resolveTagTone("signed")).toBe("success");
    });
    it("流失 → danger", () => {
      expect(resolveTagTone("流失")).toBe("danger");
    });
    it("lost → danger", () => {
      expect(resolveTagTone("lost")).toBe("danger");
    });
    it("risk → danger", () => {
      expect(resolveTagTone("risk")).toBe("danger");
    });
  });

  describe("hash stability", () => {
    it("same tag always returns the same tone", () => {
      const tone1 = resolveTagTone("random-tag-abc");
      const tone2 = resolveTagTone("random-tag-abc");
      const tone3 = resolveTagTone("random-tag-abc");
      expect(tone1).toBe(tone2);
      expect(tone2).toBe(tone3);
    });

    it("different tags can produce different tones", () => {
      const tones = new Set(
        [
          "alpha",
          "beta",
          "gamma",
          "delta",
          "epsilon",
          "zeta",
          "eta",
          "theta",
        ].map(resolveTagTone),
      );
      expect(tones.size).toBeGreaterThan(1);
    });
  });

  describe("hash palette stays within neutral/primary/success", () => {
    const candidates = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "q",
      "r",
      "s",
      "t",
      "u",
      "v",
      "w",
      "x",
      "y",
      "z",
      "tag-1",
      "tag-2",
      "tag-3",
      "tag-4",
      "tag-5",
      "foo",
      "bar",
      "baz",
      "qux",
      "quux",
      "R4-walk",
      "R4-tag-2",
    ];

    it("never returns warning / danger for non-semantic tags", () => {
      for (const c of candidates) {
        const tone = resolveTagTone(c);
        expect(tone === "warning" || tone === "danger").toBe(false);
      }
    });

    it("covers all three calm tones across a representative sample", () => {
      const tones = new Set<string>();
      for (const c of candidates) {
        tones.add(resolveTagTone(c));
      }
      expect(tones).toContain("neutral");
      expect(tones).toContain("primary");
      expect(tones).toContain("success");
    });

    it("R4 walkthrough sample tags resolve to calm tones (regression for R4-A-1 visual)", () => {
      const walkA = resolveTagTone("R4-walk");
      const walkB = resolveTagTone("R4-tag-2");
      for (const tone of [walkA, walkB]) {
        expect(["neutral", "primary", "success"]).toContain(tone);
      }
    });
  });
});

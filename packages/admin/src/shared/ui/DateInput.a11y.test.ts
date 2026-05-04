import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DateInput from "./DateInput.vue";

describe("DateInput — a11y: input has id and name when provided", () => {
  it("renders id and name on the inner <input> when props are set", () => {
    const w = mount(DateInput, {
      props: { id: "test-date", name: "testDate" },
    });
    const input = w.find("input");
    expect(input.attributes("id")).toBe("test-date");
    expect(input.attributes("name")).toBe("testDate");
  });

  it("renders type=date", () => {
    const w = mount(DateInput);
    const input = w.find("input");
    expect(input.attributes("type")).toBe("date");
  });

  it("renders data-testid when provided", () => {
    const w = mount(DateInput, {
      props: { dataTestid: "my-date" },
    });
    const input = w.find("input");
    expect(input.attributes("data-testid")).toBe("my-date");
  });
});

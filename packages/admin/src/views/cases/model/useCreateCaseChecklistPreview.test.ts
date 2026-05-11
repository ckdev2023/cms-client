import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useCreateCaseChecklistPreview } from "./useCreateCaseChecklistPreview";
import type { CaseRepository } from "./CaseRepository";

function stubRepo(count: number) {
  return {
    previewChecklistCount: vi.fn(async () => count),
  } as unknown as CaseRepository;
}

function errorRepo() {
  return {
    previewChecklistCount: vi.fn(async () => {
      throw new Error("network error");
    }),
  } as unknown as CaseRepository;
}

describe("useCreateCaseChecklistPreview", () => {
  it("fetches count on mount and reports ok state", async () => {
    const code = ref("family");
    const repo = stubRepo(5);
    const result = useCreateCaseChecklistPreview(code, repo);

    await nextTick();
    await nextTick();

    expect(result.checklistCount.value).toBe(5);
    expect(result.previewState.value).toBe("ok");
    expect(result.checklistEmpty.value).toBe(false);
  });

  it("reports empty state when count is 0", async () => {
    const code = ref("unknown_type");
    const repo = stubRepo(0);
    const result = useCreateCaseChecklistPreview(code, repo);

    await nextTick();
    await nextTick();

    expect(result.checklistCount.value).toBe(0);
    expect(result.previewState.value).toBe("empty");
    expect(result.checklistEmpty.value).toBe(true);
  });

  it("reports error state on fetch failure", async () => {
    const code = ref("family");
    const repo = errorRepo();
    const result = useCreateCaseChecklistPreview(code, repo);

    await nextTick();
    await nextTick();

    expect(result.checklistCount.value).toBeNull();
    expect(result.previewState.value).toBe("error");
    expect(result.checklistEmpty.value).toBe(false);
  });

  it("re-fetches when caseTypeCode changes", async () => {
    const code = ref("family");
    const spy = vi.fn(async (c: string) => (c === "family" ? 3 : 0));
    const repo = { previewChecklistCount: spy } as unknown as CaseRepository;
    const result = useCreateCaseChecklistPreview(code, repo);

    await nextTick();
    await nextTick();
    expect(result.checklistCount.value).toBe(3);

    code.value = "unknown_type";
    await nextTick();
    await nextTick();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.checklistCount.value).toBe(0);
    expect(result.checklistEmpty.value).toBe(true);
  });

  it("returns null count for empty caseTypeCode", async () => {
    const code = ref("");
    const repo = stubRepo(5);
    const result = useCreateCaseChecklistPreview(code, repo);

    await nextTick();
    expect(result.checklistCount.value).toBeNull();
    expect(result.previewState.value).toBe("idle");
  });
});

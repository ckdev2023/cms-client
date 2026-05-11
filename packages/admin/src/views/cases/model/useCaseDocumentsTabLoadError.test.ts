import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useCaseDocumentsTabLoadError } from "./useCaseDocumentsTabLoadError";

describe("useCaseDocumentsTabLoadError", () => {
  it("reports failed load when errorCode is set and not loading", async () => {
    const loading = ref(false);
    const errorCode = ref<"requestFailed" | null>("requestFailed");
    const refresh = vi.fn().mockResolvedValue(undefined);

    const r = useCaseDocumentsTabLoadError({
      loading,
      errorCode,
      refresh,
    });

    await nextTick();
    expect(r.documentsLoadFailed.value).toBe(true);
    expect(r.documentsLoadErrorMessageKey.value).toBe(
      "cases.detail.documents.loadError.requestFailed",
    );
  });

  it("does not report failed load while loading", async () => {
    const loading = ref(true);
    const errorCode = ref<"requestFailed" | null>("requestFailed");

    const r = useCaseDocumentsTabLoadError({
      loading,
      errorCode,
      refresh: vi.fn(),
    });

    await nextTick();
    expect(r.documentsLoadFailed.value).toBe(false);
  });

  it("retry delegates to listModel.refresh", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const r = useCaseDocumentsTabLoadError({
      loading: ref(false),
      errorCode: ref("badResponse"),
      refresh,
    });

    r.retryDocumentsListLoad();
    await flushPromises();

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

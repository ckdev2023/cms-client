import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
import { useCaseFormTemplates } from "./useCaseFormTemplates";
import type { CaseRepository } from "./CaseRepository";
import type { FormTemplate } from "../types-detail";

function makeTemplate(id: string, name: string): FormTemplate {
  return { id, name, meta: "", actionLabel: "生成" };
}

function stubRepo(
  impl: (params: {
    caseType: string;
    language?: string;
  }) => Promise<FormTemplate[]>,
): CaseRepository {
  return {
    listDocumentTemplates: vi.fn(impl),
  } as unknown as CaseRepository;
}

describe("useCaseFormTemplates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches templates on immediate watch when caseType is set", async () => {
    const tpl = makeTemplate("t1", "家族滞在申請書");
    const repo = stubRepo(() => Promise.resolve([tpl]));
    const caseType = ref("family_stay");

    const { templates } = useCaseFormTemplates({ repo, caseType });

    await nextTick();
    await vi.waitFor(() => expect(templates.value).toEqual([tpl]));
    expect(repo.listDocumentTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ caseType: "family_stay", language: undefined }),
    );
  });

  it("returns empty array when caseType is empty", async () => {
    const repo = stubRepo(() => Promise.resolve([makeTemplate("t1", "x")]));
    const caseType = ref("");

    const { templates } = useCaseFormTemplates({ repo, caseType });

    await nextTick();
    expect(templates.value).toEqual([]);
    expect(repo.listDocumentTemplates).not.toHaveBeenCalled();
  });

  it("re-fetches when caseType changes", async () => {
    const tplA = makeTemplate("t1", "A");
    const tplB = makeTemplate("t2", "B");
    let callCount = 0;
    const repo = stubRepo(() => {
      callCount++;
      return Promise.resolve(callCount === 1 ? [tplA] : [tplB]);
    });
    const caseType = ref("family_stay");

    const { templates } = useCaseFormTemplates({ repo, caseType });

    await vi.waitFor(() => expect(templates.value).toEqual([tplA]));

    caseType.value = "engineer_humanities";
    await nextTick();
    await vi.waitFor(() => expect(templates.value).toEqual([tplB]));
  });

  it("re-fetches when language changes", async () => {
    const tplJa = makeTemplate("t1", "日本語テンプレート");
    const tplZh = makeTemplate("t2", "中文模板");
    let callCount = 0;
    const repo = stubRepo(() => {
      callCount++;
      return Promise.resolve(callCount === 1 ? [tplJa] : [tplZh]);
    });
    const caseType = ref("family_stay");
    const language = ref<string | undefined>("ja");

    const { templates } = useCaseFormTemplates({ repo, caseType, language });

    await vi.waitFor(() => expect(templates.value).toEqual([tplJa]));

    language.value = "zh";
    await nextTick();
    await vi.waitFor(() => expect(templates.value).toEqual([tplZh]));
  });

  it("handles fetch error gracefully", async () => {
    const repo = stubRepo(() => Promise.reject(new Error("network")));
    const caseType = ref("family_stay");

    const { templates, loading } = useCaseFormTemplates({ repo, caseType });

    await vi.waitFor(() => expect(loading.value).toBe(false));
    expect(templates.value).toEqual([]);
  });

  it("discards stale responses when caseType changes rapidly", async () => {
    const resolvers: Array<(v: FormTemplate[]) => void> = [];
    const repo = stubRepo(
      () =>
        new Promise<FormTemplate[]>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const caseType = ref("type_a");

    const { templates } = useCaseFormTemplates({ repo, caseType });
    await nextTick();

    caseType.value = "type_b";
    await nextTick();

    resolvers[0]([makeTemplate("stale", "stale")]);
    resolvers[1]([makeTemplate("fresh", "fresh")]);
    await nextTick();

    await vi.waitFor(() =>
      expect(templates.value).toEqual([makeTemplate("fresh", "fresh")]),
    );
  });

  it("exposes refresh function for manual re-fetch", async () => {
    let callCount = 0;
    const repo = stubRepo(() => {
      callCount++;
      return Promise.resolve([makeTemplate(`t${callCount}`, `v${callCount}`)]);
    });
    const caseType = ref("family_stay");

    const { templates, refresh } = useCaseFormTemplates({ repo, caseType });

    await vi.waitFor(() => expect(templates.value[0]?.id).toBe("t1"));

    await refresh();
    expect(templates.value[0]?.id).toBe("t2");
  });

  it("docTypeKey field remains stable across re-fetches (data layer not coupled to i18n)", async () => {
    const tpl: FormTemplate = {
      id: "t1",
      name: "テスト",
      meta: "application_form · ja · v1",
      actionLabel: "生成",
      docTypeKey: "cases.detail.forms.docType.application_form",
      docTypeRaw: "application_form",
      language: "ja",
      versionNo: 1,
    };
    const repo = stubRepo(() => Promise.resolve([tpl]));
    const caseType = ref("family_stay");

    const { templates, refresh } = useCaseFormTemplates({ repo, caseType });

    await vi.waitFor(() =>
      expect(templates.value[0]?.docTypeKey).toBe(tpl.docTypeKey),
    );

    await refresh();
    expect(templates.value[0]?.docTypeKey).toBe(tpl.docTypeKey);
  });
});

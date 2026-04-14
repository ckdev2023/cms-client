import { describe, expect, it } from "vitest";
import {
  useCustomerDrafts,
  DRAFTS_STORAGE_KEY,
  type DraftStorageLike,
} from "./useCustomerDrafts";
import type { CustomerCreateFormFields } from "../types";

function createStorage(
  seed?: Record<string, string>,
): DraftStorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed ?? {}));
  return {
    data,
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
  };
}

const BLANK_FIELDS: CustomerCreateFormFields = {
  displayName: "",
  group: "",
  legalName: "",
  kana: "",
  gender: "",
  birthDate: "",
  nationality: "",
  phone: "",
  email: "",
  referrer: "",
  avatar: "",
  note: "",
};

function makeFields(
  overrides?: Partial<CustomerCreateFormFields>,
): CustomerCreateFormFields {
  return { ...BLANK_FIELDS, ...overrides };
}

describe("useCustomerDrafts", () => {
  it("starts with empty drafts when storage is empty", () => {
    const storage = createStorage();
    const { drafts } = useCustomerDrafts({ storage });
    expect(drafts.value).toEqual([]);
  });

  it("loads existing drafts from storage on init", () => {
    const existing = [
      { id: "d1", fields: makeFields({ legalName: "Alice" }), savedAt: 1000 },
    ];
    const storage = createStorage({
      [DRAFTS_STORAGE_KEY]: JSON.stringify(existing),
    });

    const { drafts } = useCustomerDrafts({ storage });
    expect(drafts.value).toHaveLength(1);
    expect(drafts.value[0].fields.legalName).toBe("Alice");
  });

  it("saveDraft persists to storage and prepends to drafts", () => {
    const storage = createStorage();
    const clock = 1000;
    const { drafts, saveDraft } = useCustomerDrafts({
      storage,
      now: () => clock,
    });

    const fields = makeFields({ legalName: "Bob", phone: "090" });
    const draft = saveDraft(fields);

    expect(draft.fields.legalName).toBe("Bob");
    expect(draft.savedAt).toBe(1000);
    expect(drafts.value).toHaveLength(1);

    const raw = storage.getItem(DRAFTS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(draft.id);
  });

  it("multiple saveDraft calls prepend in order", () => {
    const storage = createStorage();
    let clock = 1000;
    const { drafts, saveDraft } = useCustomerDrafts({
      storage,
      now: () => clock++,
    });

    saveDraft(makeFields({ legalName: "First" }));
    saveDraft(makeFields({ legalName: "Second" }));

    expect(drafts.value).toHaveLength(2);
    expect(drafts.value[0].fields.legalName).toBe("Second");
    expect(drafts.value[1].fields.legalName).toBe("First");
  });

  it("removeDraft deletes the draft from storage and list", () => {
    const storage = createStorage();
    const { drafts, saveDraft, removeDraft } = useCustomerDrafts({
      storage,
      now: () => 1000,
    });

    const d = saveDraft(makeFields({ legalName: "ToRemove" }));
    expect(drafts.value).toHaveLength(1);

    removeDraft(d.id);
    expect(drafts.value).toHaveLength(0);

    const raw = storage.getItem(DRAFTS_STORAGE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(0);
  });

  it("removeDraft is safe for non-existent ids", () => {
    const storage = createStorage();
    const { drafts, saveDraft, removeDraft } = useCustomerDrafts({
      storage,
      now: () => 1000,
    });

    saveDraft(makeFields({ legalName: "Keep" }));
    removeDraft("nonexistent");
    expect(drafts.value).toHaveLength(1);
  });

  it("getDraft returns the draft when it exists", () => {
    const storage = createStorage();
    const { saveDraft, getDraft } = useCustomerDrafts({
      storage,
      now: () => 1000,
    });

    const d = saveDraft(makeFields({ legalName: "Found" }));
    const result = getDraft(d.id);
    expect(result).toBeDefined();
    expect(result!.fields.legalName).toBe("Found");
  });

  it("getDraft returns undefined for missing id", () => {
    const storage = createStorage();
    const { getDraft } = useCustomerDrafts({ storage });
    expect(getDraft("nope")).toBeUndefined();
  });

  it("handles corrupted storage gracefully", () => {
    const storage = createStorage({
      [DRAFTS_STORAGE_KEY]: "not-valid-json",
    });

    const { drafts } = useCustomerDrafts({ storage });
    expect(drafts.value).toEqual([]);
  });

  it("handles non-array storage value gracefully", () => {
    const storage = createStorage({
      [DRAFTS_STORAGE_KEY]: JSON.stringify({ not: "array" }),
    });

    const { drafts } = useCustomerDrafts({ storage });
    expect(drafts.value).toEqual([]);
  });

  it("saveDraft does not mutate the original fields object", () => {
    const storage = createStorage();
    const { saveDraft } = useCustomerDrafts({ storage, now: () => 1000 });

    const fields = makeFields({ legalName: "Original" });
    const draft = saveDraft(fields);

    fields.legalName = "Mutated";
    expect(draft.fields.legalName).toBe("Original");
  });

  it("refresh re-reads from storage", () => {
    const storage = createStorage();
    const { drafts, refresh } = useCustomerDrafts({ storage, now: () => 1000 });

    expect(drafts.value).toHaveLength(0);

    storage.setItem(
      DRAFTS_STORAGE_KEY,
      JSON.stringify([{ id: "ext-1", fields: makeFields(), savedAt: 2000 }]),
    );

    refresh();
    expect(drafts.value).toHaveLength(1);
  });
});

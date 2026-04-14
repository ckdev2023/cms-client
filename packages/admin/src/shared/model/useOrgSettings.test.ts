import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrgSettingsController,
  initOrgSettings,
  useOrgSettings,
  resetOrgSettings,
} from "./useOrgSettings";

beforeEach(() => {
  resetOrgSettings();
});

describe("createOrgSettingsController", () => {
  it("reports configured when both rootLabel and rootPath are set", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: {
        rootLabel: "案件資料総盤",
        rootPath: "\\\\fileserver\\gyosei-docs",
      },
    });
    expect(ctrl.isStorageRootConfigured.value).toBe(true);
  });

  it("reports not configured when rootLabel is null", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: "\\\\server\\path" },
    });
    expect(ctrl.isStorageRootConfigured.value).toBe(false);
  });

  it("reports not configured when rootPath is null", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: "Label", rootPath: null },
    });
    expect(ctrl.isStorageRootConfigured.value).toBe(false);
  });

  it("reports not configured when rootLabel is empty string", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: "", rootPath: "\\\\server\\path" },
    });
    expect(ctrl.isStorageRootConfigured.value).toBe(false);
  });

  it("reports not configured when both are null", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    expect(ctrl.isStorageRootConfigured.value).toBe(false);
  });

  it("reactively updates when storageRoot changes", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    expect(ctrl.isStorageRootConfigured.value).toBe(false);

    ctrl.storageRoot.value = {
      rootLabel: "New Label",
      rootPath: "\\\\server\\path",
    };
    expect(ctrl.isStorageRootConfigured.value).toBe(true);
  });
});

describe("initOrgSettings / useOrgSettings singleton", () => {
  it("throws when useOrgSettings called before init", () => {
    expect(() => useOrgSettings()).toThrow("useOrgSettings() called before");
  });

  it("returns singleton after init", () => {
    initOrgSettings({
      initialStorageRoot: { rootLabel: "L", rootPath: "P" },
    });
    const result = useOrgSettings();
    expect(result.isStorageRootConfigured.value).toBe(true);
  });

  it("resetOrgSettings clears singleton", () => {
    initOrgSettings({
      initialStorageRoot: { rootLabel: "L", rootPath: "P" },
    });
    resetOrgSettings();
    expect(() => useOrgSettings()).toThrow();
  });
});

import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import {
  registerGroupAliases,
  clearGroupAliases,
} from "../../../shared/model/useGroupOptions";
import LeadConvertCaseDialog from "./LeadConvertCaseDialog.vue";

const TEST_USER_ID = "00000000-0000-4000-8000-00000000000a";
const TEST_GROUP_ID = "grp-tokyo-1";

let cleanup: (() => void) | null = null;

function mountDialog() {
  registerUserAliases([{ id: TEST_USER_ID, displayName: "Suzuki Taro" }]);
  registerGroupAliases([{ id: TEST_GROUP_ID, name: "tokyo-1" }]);
  const wrapper = mount(LeadConvertCaseDialog, {
    global: { plugins: [i18n] },
    props: { ownerUserId: TEST_USER_ID, groupId: TEST_GROUP_ID },
    attachTo: document.body,
  });
  cleanup = () => wrapper.unmount();
  return wrapper;
}

function readGroupOptionLabels(): string[] {
  const groupSelect = document.body.querySelector(
    "#convert-case-group",
  ) as HTMLSelectElement;
  return Array.from(groupSelect.querySelectorAll("option"))
    .filter((o) => o.value !== "")
    .map((o) => (o.textContent ?? "").trim());
}

afterEach(() => {
  cleanup?.();
  cleanup = null;
  clearUserAliases();
  clearGroupAliases();
  setAppLocale("zh-CN" as AppLocale);
});

describe("LeadConvertCaseDialog group-locale (NEW-V5-1)", () => {
  it("renders group label in zh-CN when current locale is zh-CN", () => {
    setAppLocale("zh-CN" as AppLocale);
    mountDialog();
    expect(readGroupOptionLabels()).toEqual(["东京一组"]);
  });

  it("renders group label in ja-JP when current locale is ja-JP", () => {
    setAppLocale("ja-JP" as AppLocale);
    mountDialog();
    expect(readGroupOptionLabels()).toEqual(["東京一組"]);
  });

  it("renders group label in en-US when current locale is en-US", () => {
    setAppLocale("en-US" as AppLocale);
    mountDialog();
    expect(readGroupOptionLabels()).toEqual(["Tokyo Team 1"]);
  });
});

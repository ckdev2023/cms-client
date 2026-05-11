import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { computed } from "vue";
import {
  SESSION_KEY_RESUME_LEAD_CASE_CREATE,
  persistLeadCaseCreateResume,
  readLeadCaseCreateResume,
} from "../../../shared/navigation/sessionResumeKeys";
import { useResumeLeadCaseCreateBanner } from "./useResumeLeadCaseCreateBanner";

describe("useResumeLeadCaseCreateBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("shows banner when stored customer matches route customer", () => {
    persistLeadCaseCreateResume({
      leadId: "lead-1",
      customerId: "cust-1",
    });
    const customerId = computed(() => "cust-1");
    const { refreshResumeLeadCaseCreateHash, showResumeLeadCaseCreateBanner } =
      useResumeLeadCaseCreateBanner(customerId);
    refreshResumeLeadCaseCreateHash();
    expect(showResumeLeadCaseCreateBanner.value).toBe(true);
  });

  it("hides banner when customer id mismatches", () => {
    persistLeadCaseCreateResume({
      leadId: "lead-1",
      customerId: "cust-1",
    });
    const customerId = computed(() => "cust-2");
    const { refreshResumeLeadCaseCreateHash, showResumeLeadCaseCreateBanner } =
      useResumeLeadCaseCreateBanner(customerId);
    refreshResumeLeadCaseCreateHash();
    expect(showResumeLeadCaseCreateBanner.value).toBe(false);
  });

  it("continue clears storage and sets hash for lead conversion tab", () => {
    persistLeadCaseCreateResume({
      leadId: "lead-9",
      customerId: "cust-1",
    });
    const customerId = computed(() => "cust-1");
    const { refreshResumeLeadCaseCreateHash, continueResumeLeadCaseCreate } =
      useResumeLeadCaseCreateBanner(customerId);
    refreshResumeLeadCaseCreateHash();
    continueResumeLeadCaseCreate();
    expect(readLeadCaseCreateResume()).toBeNull();
    expect(
      sessionStorage.getItem(SESSION_KEY_RESUME_LEAD_CASE_CREATE),
    ).toBeNull();
    expect(window.location.hash).toContain("lead-9");
    expect(window.location.hash).toContain("conversion");
  });

  it("dismiss clears storage", () => {
    persistLeadCaseCreateResume({
      leadId: "lead-1",
      customerId: "cust-1",
    });
    const customerId = computed(() => "cust-1");
    const {
      refreshResumeLeadCaseCreateHash,
      dismissResumeLeadCaseCreate,
      showResumeLeadCaseCreateBanner,
    } = useResumeLeadCaseCreateBanner(customerId);
    refreshResumeLeadCaseCreateHash();
    dismissResumeLeadCaseCreate();
    expect(showResumeLeadCaseCreateBanner.value).toBe(false);
    expect(readLeadCaseCreateResume()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { useLoginForm } from "./useLoginForm";

describe("useLoginForm", () => {
  it("starts with empty fields and disabled submit state", () => {
    const { fields, canSubmit, isSubmitting, submitError } = useLoginForm();

    expect(fields.email).toBe("");
    expect(fields.password).toBe("");
    expect(canSubmit.value).toBe(false);
    expect(isSubmitting.value).toBe(false);
    expect(submitError.value).toBe("");
  });

  it("enables submit after both email and password are filled", () => {
    const { fields, canSubmit } = useLoginForm();

    fields.email = "admin@example.com";
    fields.password = "secret";

    expect(canSubmit.value).toBe(true);
  });

  it("treats whitespace-only input as invalid", () => {
    const { fields, canSubmit } = useLoginForm();

    fields.email = "   ";
    fields.password = "  ";

    expect(canSubmit.value).toBe(false);
  });

  it("stores and clears submit errors", () => {
    const { submitError, setSubmitError, clearSubmitError } = useLoginForm();

    setSubmitError("missing");
    expect(submitError.value).toBe("missing");

    clearSubmitError();
    expect(submitError.value).toBe("");
  });

  it("disables submit while a request is in flight", () => {
    const {
      fields,
      canSubmit,
      isSubmitting,
      startSubmitting,
      finishSubmitting,
    } = useLoginForm();

    fields.email = "admin@example.com";
    fields.password = "secret";

    expect(canSubmit.value).toBe(true);

    startSubmitting();
    expect(isSubmitting.value).toBe(true);
    expect(canSubmit.value).toBe(false);

    finishSubmitting();
    expect(isSubmitting.value).toBe(false);
    expect(canSubmit.value).toBe(true);
  });

  it("normalizes redirect targets to internal routes only", () => {
    const { resolveRedirectTarget } = useLoginForm();

    expect(resolveRedirectTarget("/customers")).toBe("/customers");
    expect(resolveRedirectTarget("//evil.example.com")).toBe("/");
    expect(resolveRedirectTarget("/login")).toBe("/");
    expect(resolveRedirectTarget(undefined)).toBe("/");
  });

  it("resetForm clears the fields and errors", () => {
    const {
      fields,
      isSubmitting,
      submitError,
      setSubmitError,
      startSubmitting,
      resetForm,
    } = useLoginForm();

    fields.email = "admin@example.com";
    fields.password = "secret";
    setSubmitError("bad");
    startSubmitting();

    resetForm();

    expect(fields.email).toBe("");
    expect(fields.password).toBe("");
    expect(isSubmitting.value).toBe(false);
    expect(submitError.value).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { mapPassedValidationCheckI18nKeys } from "./mapPassedValidationCheckI18nKeys";

describe("mapPassedValidationCheckI18nKeys", () => {
  const title = "cases.validation.checks.generated_documents_present.title";
  const message = "cases.validation.checks.generated_documents_present.message";

  it("returns okTitle/okMessage when passed and keys match .title/.message pair", () => {
    expect(mapPassedValidationCheckI18nKeys(title, message, true)).toEqual({
      titleKey: "cases.validation.checks.generated_documents_present.okTitle",
      messageKey:
        "cases.validation.checks.generated_documents_present.okMessage",
    });
  });

  it("returns originals when passed is false", () => {
    expect(mapPassedValidationCheckI18nKeys(title, message, false)).toEqual({
      titleKey: title,
      messageKey: message,
    });
  });

  it("returns originals when titleKey/messageKey shape does not match", () => {
    expect(
      mapPassedValidationCheckI18nKeys(
        "cases.validation.checks.x.title",
        "cases.validation.checks.other.message",
        true,
      ),
    ).toEqual({
      titleKey: "cases.validation.checks.x.title",
      messageKey: "cases.validation.checks.other.message",
    });
  });
});

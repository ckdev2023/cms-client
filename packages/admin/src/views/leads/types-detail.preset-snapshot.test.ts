import { describe, expect, it } from "vitest";

import { HEADER_BUTTON_PRESETS } from "./types-detail";

describe("HEADER_BUTTON_PRESETS snapshot", () => {
  it("matches the approved preset table", () => {
    expect(HEADER_BUTTON_PRESETS).toMatchInlineSnapshot(`
      {
        "convertedCase": {
          "changeStatus": "hidden",
          "convertCase": "view-case",
          "convertCustomer": "view-customer",
          "editInfo": "enabled",
          "markLost": "hidden",
        },
        "convertedCustomer": {
          "changeStatus": "hidden",
          "convertCase": "highlighted",
          "convertCustomer": "view-customer",
          "editInfo": "enabled",
          "markLost": "hidden",
        },
        "initial": {
          "changeStatus": "enabled",
          "convertCase": "hidden",
          "convertCustomer": "hidden",
          "editInfo": "enabled",
          "markLost": "enabled",
        },
        "lost": {
          "changeStatus": "hidden",
          "convertCase": "hidden",
          "convertCustomer": "hidden",
          "editInfo": "disabled",
          "markLost": "hidden",
        },
        "normal": {
          "changeStatus": "enabled",
          "convertCase": "hidden",
          "convertCustomer": "enabled",
          "editInfo": "enabled",
          "markLost": "enabled",
        },
        "signedNotConverted": {
          "changeStatus": "enabled",
          "convertCase": "highlighted",
          "convertCustomer": "highlighted",
          "editInfo": "enabled",
          "markLost": "enabled",
        },
      }
    `);
  });
});

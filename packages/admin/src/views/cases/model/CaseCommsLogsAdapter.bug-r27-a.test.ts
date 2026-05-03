import { describe, expect, it } from "vitest";
import { adaptCaseMessageDto } from "./CaseCommsLogsAdapter";

describe("CaseCommsLogsAdapter createdBy field priority (R27-A / R27-D)", () => {
  const baseRecord = {
    id: "msg-001",
    channelType: "phone",
    createdAt: "2026-05-03T03:39:36.420Z",
    contentSummary: "Test message body",
  };

  it("prefers createdByDisplayName over createdBy UUID", () => {
    const record = {
      ...baseRecord,
      createdByDisplayName: "Local Admin",
      createdBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Local Admin");
    expect(result!.avatar).toBe("LA");
  });

  it("prefers created_by_display_name (snake_case) over created_by", () => {
    const record = {
      ...baseRecord,
      created_by_display_name: "Tanaka Taro",
      created_by: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Tanaka Taro");
    expect(result!.avatar).toBe("TT");
  });

  it("prefers createdByName over createdBy UUID", () => {
    const record = {
      ...baseRecord,
      createdByName: "Suzuki Hanako",
      createdBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Suzuki Hanako");
    expect(result!.avatar).toBe("SH");
  });

  it("prefers created_by_name (snake_case) over created_by", () => {
    const record = {
      ...baseRecord,
      created_by_name: "Yamada Ichiro",
      created_by: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Yamada Ichiro");
    expect(result!.avatar).toBe("YI");
  });

  it("falls back to 'System' when only createdBy UUID is present (no display name)", () => {
    const record = {
      ...baseRecord,
      createdBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("System");
    expect(result!.avatar).toBe("SY");
  });

  it("falls back to 'System' when only created_by (snake_case UUID) is present", () => {
    const record = {
      ...baseRecord,
      created_by: "some-uuid-value",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("System");
    expect(result!.avatar).toBe("SY");
  });

  it("falls back to 'System' when no createdBy fields are present at all", () => {
    const result = adaptCaseMessageDto(baseRecord);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("System");
    expect(result!.avatar).toBe("SY");
  });

  it("falls back to 'System' when display name fields are empty/whitespace-only", () => {
    const record = {
      ...baseRecord,
      createdByDisplayName: "   ",
      createdByName: "",
      createdBy: "fallback-uuid",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("System");
    expect(result!.avatar).toBe("SY");
  });

  it("priority order: createdByDisplayName > createdByName > System", () => {
    const record = {
      ...baseRecord,
      createdByDisplayName: "Display Name",
      createdByName: "Name Only",
      createdBy: "uuid-fallback",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Display Name");
  });

  it("uses display name only (no UUID present)", () => {
    const record = {
      ...baseRecord,
      createdByDisplayName: "Admin User",
    };
    const result = adaptCaseMessageDto(record);
    expect(result).not.toBeNull();
    expect(result!.author).toBe("Admin User");
    expect(result!.avatar).toBe("AU");
  });
});

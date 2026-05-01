import type { CreateCaseRelatedParty } from "../types";
import { getAdminAccessToken } from "../../../auth/model/adminSession";

type QuickCreateCustomerResult = { id: string };

function readQuickCreateMessage(body: unknown): string | null {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const message = (body as Record<string, unknown>).message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (!Array.isArray(message)) return null;
  const lines = message.filter(
    (item): item is string => typeof item === "string",
  );
  return lines.length > 0 ? lines.join("; ") : null;
}

async function readQuickCreateBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 *
 * @param contact
 */
/**
 * 将联系方式字符串拆分为电话号码与邮箱地址。
 *
 * @param contact - 以斜杠分隔的联系方式字符串
 * @returns 电话号码与邮箱的对象
 */
export function splitQuickCreateContact(contact: string): {
  /**
   *
   */
  phone?: string;
  /**
   *
   */
  email?: string;
} {
  const parts = contact
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  let phone: string | undefined;
  let email: string | undefined;
  for (const part of parts) {
    if (!email && part.includes("@")) {
      email = part;
      continue;
    }
    if (!phone && /[0-9０-９]/.test(part)) phone = part;
  }
  return { phone, email };
}

/**
 *
 * @param applicant
 */
/**
 * 构建快速新建客户的 API 请求体。
 *
 * @param applicant - 关联人信息
 * @returns POST /api/customers 的请求体
 */
export function buildQuickCreateCustomerPayload(
  applicant: CreateCaseRelatedParty,
) {
  const name = applicant.name.trim();
  const { phone, email } = splitQuickCreateContact(applicant.contact);
  return {
    type: "individual",
    baseProfile: {
      displayName: name,
      legalName: name,
      name_jp: name,
      group: applicant.group?.trim() || undefined,
      phone,
      email,
    },
  };
}

/**
 *
 * @param applicant
 */
/**
 * 根据申请人信息快速新建客户。
 *
 * @param applicant - 关联人基本信息
 * @returns 新建客户的 ID
 */
export async function defaultQuickCreateCustomer(
  applicant: CreateCaseRelatedParty,
): Promise<QuickCreateCustomerResult> {
  const token = getAdminAccessToken();
  let response: Response;
  try {
    response = await globalThis.fetch("/api/customers", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(buildQuickCreateCustomerPayload(applicant)),
    });
  } catch (e) {
    throw new Error(
      `Quick-create customer request failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const body = await readQuickCreateBody(response);
  if (!response.ok) {
    throw new Error(
      readQuickCreateMessage(body) ??
        `Quick-create customer failed with status ${response.status}`,
    );
  }
  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  const id = typeof record?.id === "string" ? record.id.trim() : "";
  if (!id) throw new Error("Invalid create customer response");
  return { id };
}

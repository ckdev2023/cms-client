import { getAdminAccessToken } from "../../../auth/model/adminSession";

/** 触发浏览器下载所需的 DOM 钩子。 */
export interface DownloadTriggerDeps {
  /**
   * 创建临时 anchor、设定 download 属性并 click 触发保存。
   * 默认基于 `document.createElement('a')`。
   */
  triggerSave?: (objectUrl: string, filename: string) => void;
  /** Object URL 工厂；默认使用全局 `URL.createObjectURL`。 */
  createObjectUrl?: (blob: Blob) => string;
  /** Object URL 释放方法；默认使用全局 `URL.revokeObjectURL`。 */
  revokeObjectUrl?: (objectUrl: string) => void;
  /** fetch 实现，默认使用 `globalThis.fetch`。 */
  request?: typeof fetch;
  /** token 获取函数；默认从 admin session 读取。 */
  getToken?: () => string | null;
}

/** 下载生成文書的结果类型——成功或失败原因。 */
export type DownloadGeneratedDocumentResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      reason: "unauthorized" | "gone" | "error";
    };

const DEFAULT_FILENAME = "document";

function pickFilename(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* fallthrough */
    }
  }
  const ascii = /filename="?([^";]+)"?/i.exec(contentDisposition);
  if (ascii?.[1]) {
    try {
      return decodeURIComponent(ascii[1]);
    } catch {
      return ascii[1];
    }
  }
  return fallback;
}

/**
 * 默认 fetch 实现：必须绑定 `globalThis`，否则浏览器在以 `obj.fetch(...)` 形式调用时，
 * 会把 `this` 推断为 `obj`，触发 `TypeError: Illegal invocation`。
 *
 * @param input - fetch 资源标识符（与原生 `fetch` 一致）
 * @param init - fetch 配置项（与原生 `fetch` 一致）
 * @returns 与原生 `fetch` 等价的 `Promise<Response>`
 */
const defaultFetch: typeof fetch = (input, init) =>
  globalThis.fetch(input, init);

function defaultTriggerSave(objectUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * 通过认证 fetch 下载生成文書，并以「同源 + 自定义文件名」触发浏览器保存。
 *
 * 直接 `<a href>` 无法附带 Bearer token；本函数把请求换成 fetch + Blob，
 * 再用临时 anchor 触发保存对话框。
 *
 * @param url - 后端下载 URL（通常为 `/api/generated-documents/:id/file`）
 * @param fallbackFilename - 服务器未返回 `Content-Disposition` 时的文件名
 * @param deps - DOM/fetch/token 钩子，便于测试注入
 * @returns 下载结果（成功或失败原因）
 */
export async function downloadGeneratedDocument(
  url: string,
  fallbackFilename: string,
  deps: DownloadTriggerDeps = {},
): Promise<DownloadGeneratedDocumentResult> {
  const resolved = resolveDownloadDeps(deps);

  const headers: Record<string, string> = {};
  const token = resolved.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await resolved.request(url, { headers });
  const failure = mapResponseToFailure(res);
  if (failure) return failure;

  const blob = await res.blob();
  const filename = pickFilename(
    res.headers.get("content-disposition"),
    fallbackFilename || DEFAULT_FILENAME,
  );
  const objectUrl = resolved.createObjectUrl(blob);
  try {
    resolved.triggerSave(objectUrl, filename);
  } finally {
    setTimeout(() => resolved.revokeObjectUrl(objectUrl), 1000);
  }

  return { ok: true };
}

function resolveDownloadDeps(deps: DownloadTriggerDeps): {
  request: typeof fetch;
  getToken: () => string | null;
  triggerSave: (objectUrl: string, filename: string) => void;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (objectUrl: string) => void;
} {
  return {
    request: deps.request ?? defaultFetch,
    getToken: deps.getToken ?? getAdminAccessToken,
    triggerSave: deps.triggerSave ?? defaultTriggerSave,
    createObjectUrl:
      deps.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob)),
    revokeObjectUrl:
      deps.revokeObjectUrl ??
      ((u: string) => {
        URL.revokeObjectURL(u);
      }),
  };
}

function mapResponseToFailure(
  res: Response,
): DownloadGeneratedDocumentResult | null {
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: res.status, reason: "unauthorized" };
  }
  if (res.status === 410) {
    return { ok: false, status: 410, reason: "gone" };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, reason: "error" };
  }
  return null;
}

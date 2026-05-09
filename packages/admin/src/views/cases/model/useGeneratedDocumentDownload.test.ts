import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadGeneratedDocument } from "./useGeneratedDocumentDownload";

function makeFakeFetch(
  status: number,
  body: BodyInit | null,
  headers: Record<string, string> = {},
): typeof fetch {
  const fakeFetch = (() => {
    const response = new Response(body, { status, headers });
    return Promise.resolve(response);
  }) as typeof fetch;
  return fakeFetch;
}

describe("downloadGeneratedDocument", () => {
  it("includes Bearer token header when getToken() returns a value", async () => {
    let captured: Record<string, string> | undefined;
    const fakeFetch = ((url: string, init?: RequestInit) => {
      captured = { ...((init?.headers as Record<string, string>) ?? {}) };
      void url;
      return Promise.resolve(new Response("BODY", { status: 200 }));
    }) as typeof fetch;

    const triggers: { url: string; filename: string }[] = [];
    const result = await downloadGeneratedDocument("/api/x", "fallback", {
      request: fakeFetch,
      getToken: () => "abc.def.ghi",
      createObjectUrl: () => "blob:fake",
      revokeObjectUrl: () => undefined,
      triggerSave: (u, f) => triggers.push({ url: u, filename: f }),
    });

    expect(result).toEqual({ ok: true });
    expect(captured?.Authorization).toBe("Bearer abc.def.ghi");
    expect(triggers).toHaveLength(1);
    expect(triggers[0].url).toBe("blob:fake");
    expect(triggers[0].filename).toBe("fallback");
  });

  it("does not throw when token is null; sends no Authorization header", async () => {
    let headersSent: Record<string, string> | undefined;
    const fakeFetch = ((url: string, init?: RequestInit) => {
      headersSent = { ...((init?.headers as Record<string, string>) ?? {}) };
      void url;
      return Promise.resolve(new Response("X", { status: 200 }));
    }) as typeof fetch;

    const result = await downloadGeneratedDocument("/api/x", "fallback", {
      request: fakeFetch,
      getToken: () => null,
      createObjectUrl: () => "blob:fake",
      revokeObjectUrl: () => undefined,
      triggerSave: () => undefined,
    });

    expect(result).toEqual({ ok: true });
    expect(headersSent?.Authorization).toBeUndefined();
  });

  it("decodes filename* (UTF-8) from Content-Disposition", async () => {
    const cd =
      "attachment; filename*=UTF-8''%E7%94%B3%E8%AB%8B%E7%90%86%E7%94%B1%E6%9B%B8.docx";
    const fakeFetch = makeFakeFetch(200, "X", {
      "content-disposition": cd,
    });

    const triggers: { url: string; filename: string }[] = [];
    await downloadGeneratedDocument("/api/x", "fallback", {
      request: fakeFetch,
      getToken: () => "t",
      createObjectUrl: () => "blob:1",
      revokeObjectUrl: () => undefined,
      triggerSave: (u, f) => triggers.push({ url: u, filename: f }),
    });

    expect(triggers[0].filename).toBe("申請理由書.docx");
  });

  it("decodes percent-encoded ASCII filename from Content-Disposition", async () => {
    const cd =
      'attachment; filename="%E8%B5%B0%E6%9F%A5%20v7%20%E7%A9%BA%E7%99%BD%E8%8D%89%E7%A8%BF.docx"';
    const fakeFetch = makeFakeFetch(200, "X", {
      "content-disposition": cd,
    });

    const triggers: { url: string; filename: string }[] = [];
    await downloadGeneratedDocument("/api/x", "fb", {
      request: fakeFetch,
      getToken: () => "t",
      createObjectUrl: () => "blob:1",
      revokeObjectUrl: () => undefined,
      triggerSave: (u, f) => triggers.push({ url: u, filename: f }),
    });

    expect(triggers[0].filename).toBe("走查 v7 空白草稿.docx");
  });

  it("returns reason='unauthorized' on 401", async () => {
    const result = await downloadGeneratedDocument("/api/x", "fb", {
      request: makeFakeFetch(401, ""),
      getToken: () => "t",
      createObjectUrl: () => "blob:1",
      revokeObjectUrl: () => undefined,
      triggerSave: () => undefined,
    });
    expect(result).toEqual({ ok: false, status: 401, reason: "unauthorized" });
  });

  it("returns reason='gone' on 410", async () => {
    const result = await downloadGeneratedDocument("/api/x", "fb", {
      request: makeFakeFetch(410, ""),
      getToken: () => "t",
      createObjectUrl: () => "blob:1",
      revokeObjectUrl: () => undefined,
      triggerSave: () => undefined,
    });
    expect(result).toEqual({ ok: false, status: 410, reason: "gone" });
  });

  it("returns reason='error' on 500", async () => {
    const result = await downloadGeneratedDocument("/api/x", "fb", {
      request: makeFakeFetch(500, ""),
      getToken: () => "t",
      createObjectUrl: () => "blob:1",
      revokeObjectUrl: () => undefined,
      triggerSave: () => undefined,
    });
    expect(result).toEqual({ ok: false, status: 500, reason: "error" });
  });

  describe("default fetch binding", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // 浏览器原生 fetch 严格校验 `this`：以 `obj.fetch(...)` 调用会抛
    // `TypeError: Illegal invocation`。模拟这一行为，确保默认实现已绑定 globalThis。
    it("does not throw 'Illegal invocation' when using default request hook", async () => {
      const strictFetch = function strictFetch(
        this: unknown,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _input: RequestInfo | URL,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _init?: RequestInit,
      ): Promise<Response> {
        if (this !== globalThis) {
          throw new TypeError(
            "Failed to execute 'fetch' on 'Window': Illegal invocation",
          );
        }
        return Promise.resolve(new Response("X", { status: 200 }));
      } as unknown as typeof fetch;
      vi.stubGlobal("fetch", strictFetch);

      const result = await downloadGeneratedDocument("/api/x", "fb", {
        getToken: () => "t",
        createObjectUrl: () => "blob:1",
        revokeObjectUrl: () => undefined,
        triggerSave: () => undefined,
      });

      expect(result).toEqual({ ok: true });
    });
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";

import { RequestContextInterceptor } from "./requestContext.interceptor";
import { _resetAuthConfigCacheForTest } from "../tenancy/requestContext";

function createExecutionContext(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

function createNext(): CallHandler {
  return {
    handle: () => of({ ok: true }),
  } as unknown as CallHandler;
}

function createJwt(secret: string, payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;
  const sigB64 = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${sigB64}`;
}

void test("RequestContextInterceptor attaches requestAuthInput for valid jwt", async () => {
  const prev = { ...process.env };
  _resetAuthConfigCacheForTest();
  try {
    process.env.AUTH_JWT_SECRET = "secret";
    delete process.env.AUTH_ALLOW_INSECURE_HEADERS;

    const interceptor = new RequestContextInterceptor();
    const req: {
      headers: Record<string, unknown>;
      requestAuthInput?: { orgId: string; userId: string };
      requestContext?: unknown;
    } = {
      headers: {
        authorization: `Bearer ${createJwt("secret", {
          orgId: "00000000-0000-4000-8000-000000000000",
          userId: "00000000-0000-4000-8000-000000000001",
          exp: Math.floor(Date.now() / 1000) + 60,
        })}`,
      },
    };

    await firstValueFrom(
      interceptor.intercept(createExecutionContext(req), createNext()),
    );
    assert.deepEqual(req.requestAuthInput, {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
    });
    assert.equal(req.requestContext, undefined);
  } finally {
    process.env = prev;
  }
});

void test("RequestContextInterceptor can attach requestAuthInput from headers when explicitly allowed", async () => {
  const prev = { ...process.env };
  _resetAuthConfigCacheForTest();
  try {
    delete process.env.AUTH_JWT_SECRET;
    process.env.AUTH_ALLOW_INSECURE_HEADERS = "true";

    const interceptor = new RequestContextInterceptor();
    const req: {
      headers: Record<string, unknown>;
      requestAuthInput?: { orgId: string; userId: string };
      requestContext?: unknown;
    } = {
      headers: {
        "x-org-id": "00000000-0000-4000-8000-000000000000",
        "x-user-id": "00000000-0000-4000-8000-000000000001",
      },
    };

    await firstValueFrom(
      interceptor.intercept(createExecutionContext(req), createNext()),
    );
    assert.deepEqual(req.requestAuthInput, {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
    });
    assert.equal(req.requestContext, undefined);
  } finally {
    process.env = prev;
  }
});

void test("RequestContextInterceptor ignores headers when not allowed", async () => {
  const prev = { ...process.env };
  _resetAuthConfigCacheForTest();
  try {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.AUTH_ALLOW_INSECURE_HEADERS;

    const interceptor = new RequestContextInterceptor();
    const req: {
      headers: Record<string, unknown>;
      requestAuthInput?: unknown;
      requestContext?: unknown;
    } = {
      headers: {
        "x-org-id": "00000000-0000-4000-8000-000000000000",
        "x-user-id": "00000000-0000-4000-8000-000000000001",
      },
    };

    await firstValueFrom(
      interceptor.intercept(createExecutionContext(req), createNext()),
    );
    assert.equal(req.requestAuthInput, undefined);
    assert.equal(req.requestContext, undefined);
  } finally {
    process.env = prev;
  }
});

void test("RequestContextInterceptor ignores invalid uuids", async () => {
  const prev = { ...process.env };
  _resetAuthConfigCacheForTest();
  try {
    delete process.env.AUTH_JWT_SECRET;
    process.env.AUTH_ALLOW_INSECURE_HEADERS = "true";

    const interceptor = new RequestContextInterceptor();
    const req: {
      headers: Record<string, unknown>;
      requestAuthInput?: unknown;
      requestContext?: unknown;
    } = {
      headers: {
        "x-org-id": "not-a-uuid",
        "x-user-id": "00000000-0000-4000-8000-000000000001",
      },
    };

    await firstValueFrom(
      interceptor.intercept(createExecutionContext(req), createNext()),
    );
    assert.equal(req.requestAuthInput, undefined);
    assert.equal(req.requestContext, undefined);
  } finally {
    process.env = prev;
  }
});

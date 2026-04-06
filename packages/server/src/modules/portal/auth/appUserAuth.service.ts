import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import crypto from "node:crypto";

import type { AppUser, AppUserQueryRow } from "../model/portalEntities";
import { mapAppUserRow } from "../model/portalEntities";
import { REDIS_CLIENT } from "../../../infra/redis/createRedisClient";
import type { RedisClient } from "../../../infra/redis/createRedisClient";

/** AppUser 认证上下文。 */
export type AppUserContext = {
  appUserId: string;
};

const APP_USER_COLS = `id, preferred_language, name, email, phone, status, created_at, updated_at`;
const CODE_TTL_SECONDS = 300;
const CODE_LENGTH = 6;
const JWT_EXPIRY_SECONDS = 86400 * 7; // 7 days
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_SECONDS = 600; // 10 min lockout after max attempts

/**
 * AppUser 认证服务（无密码验证码登录）。
 */
@Injectable()
export class AppUserAuthService {
  /**
   * 创建认证服务实例。
   * @param pool PostgreSQL 连接池
   * @param redis Redis 客户端
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  /**
   * 请求验证码（查找或创建 AppUser → 生成验证码 → 存 Redis）。
   * @param input 认证标识
   * @param input.email 邮箱（与 phone 二选一）
   * @param input.phone 手机号（与 email 二选一）
   * @returns 操作结果
   */
  async requestCode(input: {
    email?: string;
    phone?: string;
  }): Promise<{ ok: true }> {
    if (!input.email && !input.phone)
      throw new BadRequestException("email or phone required");

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const identifier = input.email ?? input.phone!;
    const identifierType = input.email ? "email" : "phone";

    // 查找或创建 AppUser
    let userRow = await this.findAppUserByIdentifier(
      identifierType,
      identifier,
    );
    if (!userRow) {
      // identifierType 已在 findAppUserByIdentifier 中校验为 email|phone
      const insertResult = await this.pool.query<AppUserQueryRow>(
        `insert into app_users (name, ${identifierType}) values ($1, $2) returning ${APP_USER_COLS}`,
        ["User", identifier],
      );
      userRow = insertResult.rows.at(0) ?? null;
    }

    // 生成 6 位验证码
    const code = generateCode();
    const key = `app_auth:code:${identifier}`;

    await this.ensureRedisConnected();
    await this.redis.set(key, code, { EX: CODE_TTL_SECONDS });

    return { ok: true };
  }

  /**
   * 验证码校验 → 签发 JWT。
   * @param input 校验参数
   * @param input.email 邮箱（与 phone 二选一）
   * @param input.phone 手机号（与 email 二选一）
   * @param input.code 验证码
   * @returns JWT token 和 AppUser
   */
  async verifyCode(input: {
    email?: string;
    phone?: string;
    code: string;
  }): Promise<{ token: string; appUser: AppUser }> {
    if (!input.email && !input.phone)
      throw new BadRequestException("email or phone required");

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const identifier = input.email ?? input.phone!;
    const identifierType = input.email ? "email" : "phone";
    const key = `app_auth:code:${identifier}`;

    await this.ensureRedisConnected();

    // P1-1: 验证尝试次数限制
    const attemptsKey = `app_auth:attempts:${identifier}`;
    const attemptsRaw = await this.redis.get(attemptsKey);
    const attempts = attemptsRaw ? Number(attemptsRaw) : 0;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException(
        "Too many attempts — please request a new code",
      );
    }

    const storedCode = await this.redis.get(key);
    // P1-1: timing-safe 比较
    if (!storedCode || !timingSafeCodeEqual(storedCode, input.code)) {
      await this.redis.set(attemptsKey, String(attempts + 1), {
        EX: VERIFY_LOCKOUT_SECONDS,
      });
      throw new BadRequestException("Invalid or expired code");
    }

    await this.redis.del(key);
    await this.redis.del(attemptsKey);

    const userRow = await this.findAppUserByIdentifier(
      identifierType,
      identifier,
    );
    if (!userRow) throw new BadRequestException("App user not found");
    const appUser = mapAppUserRow(userRow);

    const token = signAppUserJwt(appUser.id, readJwtSecret());
    return { token, appUser };
  }

  /**
   * 获取当前 AppUser 信息。
   * @param appUserId AppUser ID
   * @returns AppUser 信息
   */
  async me(appUserId: string): Promise<AppUser> {
    const result = await this.pool.query<AppUserQueryRow>(
      `select ${APP_USER_COLS} from app_users where id = $1 limit 1`,
      [appUserId],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("App user not found");
    return mapAppUserRow(row);
  }

  private async findAppUserByIdentifier(
    type: string,
    value: string,
  ): Promise<AppUserQueryRow | null> {
    // P2-1: SQL 列名白名单防注入
    const ALLOWED_COLUMNS = new Set(["email", "phone"]);
    if (!ALLOWED_COLUMNS.has(type)) {
      throw new BadRequestException(`Invalid identifier type: ${type}`);
    }
    const result = await this.pool.query<AppUserQueryRow>(
      `select ${APP_USER_COLS} from app_users where ${type} = $1 limit 1`,
      [value],
    );
    return result.rows.at(0) ?? null;
  }

  private async ensureRedisConnected(): Promise<void> {
    if (!this.redis.isOpen) await this.redis.connect();
  }
}

function generateCode(): string {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(CODE_LENGTH, "0");
}

/**
 * 读取 JWT 密钥。生产环境必须设置 AUTH_JWT_SECRET。
 *
 * @returns JWT 密钥
 */
export function readJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_JWT_SECRET is required in production — refusing to start with insecure default",
      );
    }
    // 开发/测试环境保留 fallback 并输出警告
    // eslint-disable-next-line no-console
    console.warn(
      "[SECURITY] AUTH_JWT_SECRET not set — using insecure default. Do NOT use in production.",
    );
    return "dev-secret-change-me";
  }
  return secret;
}

/**
 * 签发 AppUser JWT（HS256）。
 * @param appUserId AppUser ID
 * @param secret JWT 密钥
 * @returns JWT token 字符串
 */
export function signAppUserJwt(appUserId: string, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    appUserId,
    type: "app_user",
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };
  const h = toBase64Url(JSON.stringify(header));
  const p = toBase64Url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64url");
  return `${h}.${p}.${sig}`;
}

/**
 * 验证并解析 AppUser JWT。
 * @param token JWT token
 * @param secret JWT 密钥
 * @returns AppUserContext 或 null
 */
export function verifyAppUserJwt(
  token: string,
  secret: string,
): AppUserContext | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [hB64, pB64, sigB64] = parts;
  if (!hB64 || !pB64 || !sigB64) return null;

  if (!verifySignature(hB64, pB64, sigB64, secret)) return null;

  const payload = parsePayload(pB64);
  if (!payload) return null;
  if (payload.type !== "app_user") return null;
  if (typeof payload.appUserId !== "string") return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now >= payload.exp) return null;

  return { appUserId: payload.appUserId };
}

function verifySignature(
  hB64: string,
  pB64: string,
  sigB64: string,
  secret: string,
): boolean {
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${hB64}.${pB64}`)
    .digest("base64url");
  try {
    const eBuf = Buffer.from(expectedSig);
    const sBuf = Buffer.from(sigB64);
    return eBuf.length === sBuf.length && crypto.timingSafeEqual(eBuf, sBuf);
  } catch {
    return false;
  }
}

function parsePayload(pB64: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(pB64, "base64url").toString()) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function toBase64Url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

/**
 * Timing-safe 验证码比较（防止时序攻击）。
 *
 * @param a 预期验证码
 * @param b 用户输入验证码
 * @returns 是否相等
 */
function timingSafeCodeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import crypto, { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";

import { parseRole, type Role } from "./roles";
import {
  readRequestAuthJwtSecret,
  signRequestAuthToken,
} from "../tenancy/requestContext";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_ALGORITHM = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

type LoginUserQueryRow = {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  password_hash: string | null;
};

const LOGIN_USER_SQL = `
        select u.id,
               u.org_id,
               u.name,
               u.email,
               r.code as role,
               u.status,
               u.password_hash
        from users u
        join roles r on r.id = u.role_id
        where lower(u.email) = lower($1)
        limit 2
      `;

/**
 *
 */
export type AdminLoginInput = {
  email: string;
  password: string;
};

/**
 *
 */
export type AdminLoginUser = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
};

/**
 *
 */
export type AdminLoginResult = {
  token: string;
  user: AdminLoginUser;
};

/**
 * 后台认证服务。
 */
@Injectable()
export class AuthService {
  /**
   * 创建后台认证服务实例。
   *
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  private async fetchLoginCandidates(
    email: string,
  ): Promise<LoginUserQueryRow[]> {
    try {
      const result = await this.pool.query<LoginUserQueryRow>(LOGIN_USER_SQL, [
        email,
      ]);
      return result.rows;
    } catch (cause) {
      if (isAuthDatabaseConnectivityFailure(cause)) {
        throw new ServiceUnavailableException(
          "Authentication database is unavailable",
        );
      }
      throw cause;
    }
  }

  /**
   * 校验邮箱密码并签发后台 JWT。
   *
   * @param input 登录输入
   * @returns JWT 与当前用户信息
   */
  async login(input: AdminLoginInput): Promise<AdminLoginResult> {
    const email = normalizeEmail(input.email);
    const password = input.password;
    if (email.length === 0 || password.trim().length === 0) {
      throw new BadRequestException("Email and password are required");
    }

    const rows = await this.fetchLoginCandidates(email);

    if (rows.length !== 1) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const userRow = rows[0];
    if (userRow.status !== "active") {
      throw new UnauthorizedException("Invalid email or password");
    }

    const role = parseRole(userRow.role);
    if (!role || !userRow.password_hash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const matched = await verifyPassword(password, userRow.password_hash);
    if (!matched) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const user = mapLoginUser(userRow, role);
    const token = signRequestAuthToken(
      { orgId: user.orgId, userId: user.id },
      readRequestAuthJwtSecret(),
    );

    return { token, user };
  }
}

/**
 * 为后台密码生成可存储 hash。
 *
 * @param password 明文密码
 * @returns 可存入 `users.password_hash` 的字符串
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.trim().length === 0) {
    throw new BadRequestException("Password is required");
  }

  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("base64url");
  const derivedKey = await derivePasswordKey(password, salt);
  return `${PASSWORD_HASH_ALGORITHM}$${salt}$${derivedKey.toString("base64url")}`;
}

/**
 * 验证明文密码与存储 hash 是否匹配。
 *
 * @param password 明文密码
 * @param storedHash 存储 hash
 * @returns 是否匹配
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parsed = parseStoredPasswordHash(storedHash);
  if (!parsed) return false;

  const actualKey = await derivePasswordKey(password, parsed.salt);
  const expectedKey = Buffer.from(parsed.keyB64, "base64url");
  if (actualKey.length !== expectedKey.length) return false;

  try {
    return crypto.timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}

function mapLoginUser(row: LoginUserQueryRow, role: Role): AdminLoginUser {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    email: normalizeEmail(row.email),
    role,
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const NETWORK_LAYER_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
]);

function authDbErrorCodeImpliesConnectivityFailure(code: string): boolean {
  if (NETWORK_LAYER_ERROR_CODES.has(code)) return true;
  return code.length >= 2 && code.startsWith("08");
}

function authDbMessageImpliesConnectivityFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("connect econnrefused") ||
    m.includes("connection terminated unexpectedly") ||
    m.includes("server closed the connection unexpectedly")
  );
}

function isAuthDatabaseConnectivityFailure(cause: unknown): boolean {
  if (!cause || typeof cause !== "object") return false;
  const err = cause as NodeJS.ErrnoException & {
    code?: unknown;
    message?: unknown;
  };
  const code = typeof err.code === "string" ? err.code : "";
  if (authDbErrorCodeImpliesConnectivityFailure(code)) return true;
  const msg = err.message;
  return (
    typeof msg === "string" && authDbMessageImpliesConnectivityFailure(msg)
  );
}

async function derivePasswordKey(
  password: string,
  salt: string,
): Promise<Buffer> {
  const derivedKey = (await scrypt(
    password,
    Buffer.from(salt, "base64url"),
    PASSWORD_KEY_LENGTH,
  )) as Buffer;
  return Buffer.from(derivedKey);
}

function parseStoredPasswordHash(value: string): {
  salt: string;
  keyB64: string;
} | null {
  const [algorithm, salt, keyB64] = value.split("$");
  if (
    algorithm !== PASSWORD_HASH_ALGORITHM ||
    !salt ||
    !keyB64 ||
    value.split("$").length !== 3
  ) {
    return null;
  }

  try {
    Buffer.from(salt, "base64url");
    Buffer.from(keyB64, "base64url");
    return { salt, keyB64 };
  } catch {
    return null;
  }
}

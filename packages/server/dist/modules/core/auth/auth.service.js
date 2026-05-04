var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import crypto, { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import { parseRole } from "./roles";
import {
  readRequestAuthJwtSecret,
  signRequestAuthToken,
} from "../tenancy/requestContext";
const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_ALGORITHM = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;
/**
 * 后台认证服务。
 */
let AuthService = class AuthService {
  pool;
  /**
   * 创建后台认证服务实例。
   *
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 校验邮箱密码并签发后台 JWT。
   *
   * @param input 登录输入
   * @returns JWT 与当前用户信息
   */
  async login(input) {
    const email = normalizeEmail(input.email);
    const password = input.password;
    if (email.length === 0 || password.trim().length === 0) {
      throw new BadRequestException("Email and password are required");
    }
    const result = await this.pool.query(
      `
        select id, org_id, name, email, role, status, password_hash
        from users
        where lower(email) = lower($1)
        limit 2
      `,
      [email],
    );
    if (result.rows.length !== 1) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const userRow = result.rows[0];
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
};
AuthService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  AuthService,
);
export { AuthService };
/**
 * 为后台密码生成可存储 hash。
 *
 * @param password 明文密码
 * @returns 可存入 `users.password_hash` 的字符串
 */
export async function hashPassword(password) {
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
export async function verifyPassword(password, storedHash) {
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
function mapLoginUser(row, role) {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    email: normalizeEmail(row.email),
    role,
  };
}
function normalizeEmail(value) {
  return value.trim().toLowerCase();
}
async function derivePasswordKey(password, salt) {
  const derivedKey = await scrypt(
    password,
    Buffer.from(salt, "base64url"),
    PASSWORD_KEY_LENGTH,
  );
  return Buffer.from(derivedKey);
}
function parseStoredPasswordHash(value) {
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
//# sourceMappingURL=auth.service.js.map

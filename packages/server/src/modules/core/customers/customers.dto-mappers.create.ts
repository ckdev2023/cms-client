import type { Customer } from "../model/coreEntities";
import { mapCustomerToDetailDto } from "./customers.dto-mappers";
import type { CustomerDetailDto } from "./customers.types";

/**
 * `POST /api/customers` 返回体类型（BUG-164）。
 *
 * 对齐 `GET /api/customers` 的顶层 DTO 字段，同时保留原始 `Customer` 实体
 * 字段（`baseProfile` / `contacts` / `type` / `orgId` / `createdAt` /
 * `updatedAt`）以便存量消费方平滑迁移（双写过渡）。
 */
export type CustomerCreateResponseDto = CustomerDetailDto & {
  orgId: string;
  type: string;
  baseProfile: Record<string, unknown>;
  contacts: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
};

/**
 * 将创建客户后得到的领域实体映射为 `POST /api/customers` 返回体。
 *
 * BUG-164：`POST /api/customers` 与 `GET /api/customers` 必须使用相同
 * 的顶层字段集（`customerNumber` / `displayName` / `legalName` /
 * `phone` / `email` / `group` / `owner` / ...），避免前端为 mutation
 * 与 read 路径维护两套字段访问器。
 *
 * 同时保留原始实体的 `baseProfile` / `contacts` / `type` / `orgId` /
 * `createdAt` / `updatedAt`，供历史调用方按 `baseProfile.customerNumber`
 * 等路径继续读取（双写过渡）。
 *
 * @param customer - 创建后的客户领域实体
 * @returns 创建接口返回体
 */
export function mapCustomerToCreateResponseDto(
  customer: Customer,
): CustomerCreateResponseDto {
  return {
    ...mapCustomerToDetailDto(customer),
    orgId: customer.orgId,
    type: customer.type,
    baseProfile: customer.baseProfile,
    contacts: customer.contacts,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

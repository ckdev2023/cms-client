import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import type { CaseCreateInput, CasePartyCreateInput } from "./CaseAdapterTypes";
import { vi } from "vitest";

/**
 * 构造带 createCase / createCaseParty mock 的测试用仓储与调用追踪。
 * @returns mock 仓储、spy 与 party 调用序列读取函数
 */
export function trackingRepo() {
  let n = 0;
  const caseSpy = vi.fn(
    async (args: CaseCreateInput): Promise<{ id: string }> => {
      void args;
      return { id: `CASE-PT-${++n}` };
    },
  );
  const partySpy = vi.fn(
    async (args: CasePartyCreateInput): Promise<{ id: string }> => {
      void args;
      return { id: "party-stub" };
    },
  );
  return {
    repo: {
      createCase: caseSpy,
      createCaseParty: partySpy,
      previewChecklistCount: vi.fn(async () => ({
        count: 10,
        requiredCount: 8,
      })),
    } as unknown as CaseRepository,
    caseSpy,
    partySpy,
    calls: () => {
      const rows = partySpy.mock.calls as unknown as [CasePartyCreateInput][];
      return rows.map((c) => c[0]);
    },
  };
}

/**
 * 默认建案依赖（模板/分组/客户列表 fixture），可被 `o` 覆盖。
 * @param o - 部分覆盖项
 * @returns 完整依赖注入对象
 */
export function deps(
  o: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { customerId: "cust-001", familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...o,
  };
}

/**
 * 填齐可提交所需字段（期限、金额），便于单测调用 `submit()`。
 * @param m - 建案模型实例
 * @returns 同一实例
 */
export function ready(m: ReturnType<typeof useCreateCaseModel>) {
  m.setDueDate("2026-06-01");
  m.setAmount("100000");
  return m;
}

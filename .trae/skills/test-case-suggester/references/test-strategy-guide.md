# 分层测试策略速查与 Mock 模式

## 测试优先级矩阵

| 层级 | 优先级 | 测试框架 | mock 目标 | 典型断言 |
|------|--------|----------|-----------|----------|
| domain | 必须 | vitest | 无（纯函数） | 返回值、抛出异常、状态变换 |
| data | 必须 | vitest | HTTP client / fetch | 请求参数、响应转换、错误处理 |
| model | 应当 | vitest + renderHook | 仓库接口 / 导航 / 通知 | 状态变化、副作用触发、loading 状态 |
| ui | 可选 | vitest + testing-library | ViewModel Hook | 渲染输出、交互事件 |

## Domain 层测试模式

```typescript
// 纯函数断言——不需要 mock
import { validateBillingPlan } from '@/domain/billing/validateBillingPlan';

describe('validateBillingPlan', () => {
  it('合法计划通过校验', () => {
    const plan = { amount: 100, dueDate: '2026-05-01' };
    expect(validateBillingPlan(plan)).toEqual({ valid: true });
  });

  it('金额为零时拒绝', () => {
    const plan = { amount: 0, dueDate: '2026-05-01' };
    expect(validateBillingPlan(plan)).toEqual({
      valid: false,
      reason: 'amount_zero',
    });
  });
});
```

## Data 层测试模式

```typescript
// mock HTTP client——不发真实请求
import { createBillingRepository } from '@/data/billing/billingRepository';

describe('BillingRepository', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
  };

  const repo = createBillingRepository(mockHttpClient);

  it('获取收费计划列表', async () => {
    mockHttpClient.get.mockResolvedValue({ data: [{ id: '1' }] });
    const result = await repo.listPlans('case-1');
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/cases/case-1/billing-plans');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('网络失败时抛出领域错误', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('Network Error'));
    await expect(repo.listPlans('case-1')).rejects.toThrow('BILLING_FETCH_FAILED');
  });
});
```

## Model 层测试模式

```typescript
// mock 仓库接口——通过 domain 接口注入
import { renderHook, act } from '@testing-library/react';
import { useBillingViewModel } from '@/features/billing/model/useBillingViewModel';

describe('useBillingViewModel', () => {
  const mockRepo = {
    listPlans: vi.fn(),
    registerPayment: vi.fn(),
  };

  it('初始状态为 idle', () => {
    const { result } = renderHook(() => useBillingViewModel(mockRepo, 'case-1'));
    expect(result.current.state).toBe('idle');
  });

  it('加载后状态转为 success', async () => {
    mockRepo.listPlans.mockResolvedValue([{ id: '1' }]);
    const { result } = renderHook(() => useBillingViewModel(mockRepo, 'case-1'));
    await act(async () => {
      await result.current.loadPlans();
    });
    expect(result.current.state).toBe('success');
    expect(result.current.plans).toHaveLength(1);
  });
});
```

## 常见 Mock 目标速查

| 依赖类型 | mock 方式 | 注意事项 |
|----------|-----------|----------|
| HTTP client (fetch/axios) | `vi.fn()` 注入 | 不用 `msw` 除非集成测试 |
| 仓库接口 | 创建 mock 对象实现 domain interface | 保持接口签名一致 |
| 导航 (router) | `vi.fn()` 替换 `navigate` | 只在 model 层测试中需要 |
| 定时器 (setTimeout) | `vi.useFakeTimers()` | 测试后恢复 |
| 日期 (Date.now) | `vi.setSystemTime()` | 测试后恢复 |
| 本地存储 | `vi.fn()` 替换 storage 方法 | 不依赖浏览器 API |

## 不需要测试的情况

| 类型 | 示例 | 原因 |
|------|------|------|
| 纯类型定义 | `type Customer = { ... }` | 无运行时逻辑 |
| 接口声明 | `interface CustomerRepository` | 无实现 |
| 枚举常量 | `enum CaseStatus { ... }` | TypeScript 编译器已校验 |
| CSS / HTML 模板 | `*.css`, `sections/*.html` | 非逻辑代码 |
| 配置映射 | `{ label: '已完成', value: 'done' }` | 纯数据，无分支 |

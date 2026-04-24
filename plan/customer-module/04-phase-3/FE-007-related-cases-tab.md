# FE-007：将关联案件 Tab 切到真实数据

## 目标

- 让客户详情的关联案件 Tab 不再读取 fixture。
- 保留现有筛选体验，并接通“查看案件详情”的跳转。

## 依赖

- `SV-006` 已提供可用的关联案件查询能力。
- `FE-003` 已让客户详情页读取真实 customer detail。

## 当前现状

- `packages/admin/src/views/customers/model/useCustomerCasesModel.ts` 仍读取 `SAMPLE_CASES_BY_CUSTOMER`。
- `packages/admin/src/views/customers/components/CustomerCasesTab.vue` 中查看/建案按钮仍为占位态。
- `packages/admin/src/views/customers/model/CustomerRepository.ts` 目前只覆盖 list/detail/basic mutation，尚无关联案件读取能力。

## 重点文件

- `packages/admin/src/views/customers/model/useCustomerCasesModel.ts`
- `packages/admin/src/views/customers/components/CustomerCasesTab.vue`
- `packages/admin/src/views/customers/model/CustomerRepository.ts`
- `packages/admin/src/views/customers/types.ts`
- `packages/admin/src/router/index.ts`

## 建议实施步骤

1. 为 customers 侧补充“查询关联案件”仓储能力与 DTO adapter。
2. 将 cases tab model 改为异步读取真实数据，保留 `all / active / archived` 筛选。
3. 将行内“查看”与名称点击接到 `#/cases/:id`。
4. 明确空态、加载态、异常态，避免从 fixture 回退。
5. 为 model / repository adapter 补单测，mock 请求返回。

## 完成标准

- cases tab 不再依赖 `SAMPLE_CASES_BY_CUSTOMER`。
- 活跃/归档筛选仍可正常工作。
- 点击案件名称或查看按钮可进入案件详情页。
- 接口缺字段时 UI 有稳定 fallback，不出现空白崩溃。

## 风险提示

- 若 server 返回的 case 摘要字段与前端表格列不一致，adapter 会反复返工。
- 若只替换展示不补跳转，用户仍需要二次搜索案件，阶段价值会打折。
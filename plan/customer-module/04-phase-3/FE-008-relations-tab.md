# FE-008：将关联人 Tab 切到真实数据

## 目标

- 让关联人 Tab 改为真实关系数据来源。
- 先保证“查询 + 新增/编辑 + 回写”，再考虑高级筛选。

## 依赖

- `SV-009` 已提供关系查询能力。
- `SV-010` 已提供关系新增/编辑能力。
- `FE-003` 已让详情页读取真实 customer detail。

## 当前现状

- `packages/admin/src/views/customers/model/useCustomerContactsModel.ts` 仍读取 `SAMPLE_RELATIONS_BY_CUSTOMER`。
- `packages/admin/src/views/customers/components/CustomerContactsTab.vue` 的新增与批量建案按钮仍处于占位/禁用状态。
- `packages/admin/src/views/customers/model/CustomerRepository.ts` 目前没有 relations 读写接口。

## 重点文件

- `packages/admin/src/views/customers/model/useCustomerContactsModel.ts`
- `packages/admin/src/views/customers/components/CustomerContactsTab.vue`
- `packages/admin/src/views/customers/model/CustomerRepository.ts`
- `packages/admin/src/views/customers/types.ts`
- `packages/server/src/modules/core/customers/customers.dto-mappers.ts`

## 建议实施步骤

1. 先冻结 relations DTO ↔ 前端 `CustomerRelation` 的映射规则。
2. 为 customers repository 增加关系查询与新增/编辑接口。
3. 将 contacts model 改为真实数据读取，同时保留搜索、多选与全选逻辑。
4. 接通新增/编辑关系 UI，并在成功后回写当前 tab 列表。
5. 为 relations model / adapter / mutation 流程补单测，禁止真实网络请求。

## 完成标准

- relations tab 不再依赖 `SAMPLE_RELATIONS_BY_CUSTOMER`。
- 搜索、全选、多选逻辑在真数据下仍然稳定。
- 新增/编辑成功后无需手动刷新即可看到回写结果。
- 关系对象的主键、关系类型、联系方式口径在前后端保持一致。

## 风险提示

- 若继续混用 `contact_persons` 与 `CustomerRelation` 两套口径，后续批量建案仍会错位。
- 若只打通查询、不打通回写，`FE-012` 会被迫重新补关系编辑链路。
# S5: Case 状态机完善

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S5 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S4（Case 字段扩展） |
| 后续解锁 | S7（DocumentItem 状态扩展） |
| 预估工时 | 0.5 天 |

## 目标

定义完整的 12 状态流转默认规则，使 CasesService.transition 在无 Template 时也能校验合法流转。对应产品文档 `05-核心流程与状态流转 §6`。

## 完整状态集

```
new_inquiry → following_up → pending_signing → signed →
pending_submission → submitted_reviewing → pending_correction →
correction_in_progress → approved → rejected → archived
```

## 默认流转矩阵

| 当前状态 | 允许流转到 |
|---|---|
| new_inquiry | following_up, archived |
| following_up | pending_signing, archived |
| pending_signing | signed, following_up, archived |
| signed | pending_submission |
| pending_submission | submitted_reviewing |
| submitted_reviewing | pending_correction, approved, rejected |
| pending_correction | correction_in_progress |
| correction_in_progress | submitted_reviewing |
| approved | archived |
| rejected | following_up, archived |
| archived | （终态） |

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/cases/cases.service.ts` — 新增 DEFAULT_CASE_TRANSITIONS 常量 + transition 方法兼容
- `packages/server/src/modules/core/cases/cases.service.test.ts` — 新增状态流转测试

## 实现规范

1. 在 cases.service.ts 顶部定义 `DEFAULT_CASE_TRANSITIONS: Record<string, string[]>`
2. `transition` 方法逻辑：
   - 优先使用 Template 定义的 state_flow（已有逻辑）
   - 若 Template 无 state_flow 或 Template 404，则回退到 `DEFAULT_CASE_TRANSITIONS`
   - 若 fromStatus → toStatus 不在允许列表，抛 BadRequestException
3. 导出 `DEFAULT_CASE_TRANSITIONS` 供测试使用
4. 状态变更写 Timeline（已有）

## 测试要求

- 每对合法流转验证通过
- 非法流转（如 new_inquiry → approved）抛错
- archived 终态无法继续流转
- Template 流转优先于默认流转
- 无 Template 时回退默认流转

## DoD

- [ ] DEFAULT_CASE_TRANSITIONS 覆盖 12 状态
- [ ] transition 方法兼容 Template + 默认
- [ ] 单测覆盖全部合法/非法路径
- [ ] 现有测试不受影响
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```

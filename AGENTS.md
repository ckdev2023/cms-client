# CMS Client — Agent Instructions

## 必须遵守（门禁）

- 任何代码改动必须通过 `npm run guard`
- 收尾顺序：先 `npm run fix`，再 `npm run guard`
- 新增/修改逻辑必须补单测；优先覆盖 `model` / `domain` / `data`
- 禁止在测试里发起真实网络请求（必须 mock 或注入 stub）
- 仅使用 npm（保持 `package-lock.json` 为唯一锁文件）

## 架构边界（强制）

- 禁止在页面/组件里堆业务逻辑；业务逻辑放在 feature 的 `model` 层（Hook/ViewModel）
- `domain` 只放纯 TypeScript（类型/实体/接口/领域逻辑），不得依赖 React Native、导航、网络实现
- `data` 实现 `domain` 接口；`infra` 只提供通用能力（HTTP/存储/日志），不得反向依赖业务
- feature 层禁止直接依赖 `data` / `infra`（通过 app container + `domain` / `shared` 协作）
- feature 层禁止直接依赖 `tamagui` / `@tamagui/*`（必须通过 `shared/ui` 封装组件）
- `domain` / `data` 禁止依赖 `shared/ui`
- feature 之间禁止直接互相依赖；跨 feature 协作必须走 `domain` / `shared` 或 public 出口

## 只做用户要求

- 只做用户明确要求的改动，禁止顺手“顺带优化”无关文件
- 除非用户明确要求，不主动创建额外文档/总结文件

## 知识库（Karpathy 编译式沉淀，P0 最小落地）

### 目标

- 把 P0 阶段高返工成本内容沉淀成可复用资产：决策（ADR）、口径、契约、Runbook
- 将“原始材料”与“权威定义”分层：原始材料只追加；权威文档可引用、可审阅、可维护

### 资料入口（仓库内）

- 产品规范与页面文档：`docs/gyoseishoshi_saas_md/`
- 原始输入（append-only）：`docs/gyoseishoshi_saas_md/_raw/00-inbox.md`
- 产出归档（问答/分析可回灌）：`docs/gyoseishoshi_saas_md/_output/00-outputs.md`

### 工作方式（闭环）

- Ingest：把会议纪要/讨论串/链接要点/素材先追加进 `_raw/00-inbox.md`
- Compile：将 Inbox 中 Top3 条目编译为结构化页面（按现有模板），并挂到权威目录与索引中
- File-back：当一次问答/分析产生可复用结论时，把“可入库版本”写入 `_output/00-outputs.md`，再择机回灌到权威文档
- Lint：每周检查矛盾、过期、缺口；过期内容必须标记并给出替代入口


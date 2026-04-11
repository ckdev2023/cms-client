# Prototype Module Split Reference

## 1. 拆分目标

通用模块拆分至少同时服务 3 件事：

1. 让当前原型更易维护
2. 让后续真实代码迁移有可追踪映射
3. 让其他模块可以沿用同一套交付物和命名方式

## 2. 标准产物

### `P0-CONTRACT.md`

作用：定义当前模块在 P0 阶段必须保留的字段、交互、状态、异常态、非范围项和回归清单。

必须包含：

- 权威规格来源
- 必保留字段/区块/动作
- 关键启用态与校验规则
- demo-only 说明
- 非范围项
- 回归清单

### `SPLIT-ARCHITECTURE.md`

作用：定义模块目录结构、文件职责、共享边界、推荐拆分顺序。

必须包含：

- 当前问题与耦合点
- 目标目录结构
- `shared/` 与模块页层边界
- `sections` / `scripts` / `data` 职责表
- 推荐执行顺序

### `MIGRATION-MAPPING.md`

作用：把原型中的 section、data、script 映射到真实代码层级。

必须包含：

- `domain` 映射
- `data` 映射
- `features/model` 映射
- `features/ui` 映射
- `shared` 映射
- 迁移顺序
- 原型与生产差异备忘

### `split-manifest.json`

作用：机器可读地列出模块拆分信息，供脚本、后续 agent、评审或批量流程消费。

至少包含：

- 模块标识
- 入口文件
- 规格文档
- section 清单
- data 文件清单
- script 文件清单
- shared 候选
- 生产映射
- 回归清单

## 3. 源文件分析顺序

先看“外部约束”，再看“入口结构”，最后看“脚本与配置”。

推荐顺序：

1. 规格文档
2. 模块入口页
3. 现有拆分文档
4. `data/*.js`
5. `scripts/*.js`
6. 共享样式/壳层

不要上来就机械地把 HTML 分块。先确认哪些是共享能力，哪些是模块独占能力。

## 4. 如何判断 `shared` 与模块页层

进入 `shared/` 的典型内容：

- 多页都会复用的样式 token
- 通用按钮、表格、表单、弹窗样式
- 桌面导航、顶部栏、移动导航壳层
- 不带业务语义的基础脚本，如移动导航开关

留在模块页层的典型内容：

- 当前模块独有的 header / filters / table / modal / toast
- 当前模块独有的建档、草稿、批量动作、页初始化
- 只对本模块成立的配置与演示数据

判断规则：

- 如果删掉模块名仍然成立，优先考虑 `shared/`
- 如果依赖模块字段、模块文案、模块状态机，留在模块页层

## 5. 如何划分 `sections`

`sections/*.html` 应按“UI 区块职责”切，不按视觉像素或代码长度切。

常见 section 维度：

- `header`
- `filters`
- `table` / `list`
- `pagination`
- `detail-panel`
- `create-modal` / `edit-modal`
- `toast` / `empty-state`

每个 section 都应该在 manifest 中记录：

- `file`
- `purpose`
- `sourceAnchors`
- `contractRefs`
- `productionTarget`

## 6. 如何划分 `scripts`

一个 script 文件只负责一个能力域。

常见能力域：

- 页面初始化
- 弹窗状态与表单校验
- 草稿 CRUD
- 批量操作
- 搜索与筛选
- 导航或壳层交互

每个 script 都要记录：

- `file`
- `purpose`
- `domHooks`
- `dependsOn`
- `demoOnly`
- `productionTarget`

不要把这些混在一个页面总脚本里：

- toast 管理
- modal 管理
- localStorage 草稿
- bulk actions
- 页面 bootstrapping

## 7. 如何划分 `data`

`data/*.js` 放声明式内容，不放行为编排。

适合进入 `data/` 的内容：

- 列定义
- filter options
- form field schema
- label map
- storage key
- toast preset
- 静态演示数据

不应进入 `data/` 的内容：

- `querySelector`
- `addEventListener`
- `innerHTML`
- `classList`
- 事件代理

每个 data 文件都要记录：

- `file`
- `purpose`
- `exports`
- `consumers`
- `productionTarget`

## 8. 生产代码映射规则

默认映射到仓库现有分层：

- `data/*.js` -> `domain/*` 常量、类型、接口，或 `data/*` 仓库实现
- `scripts/*page*.js` -> `features/*/model/useXxxViewModel`
- `scripts/*modal*.js` -> `features/*/model/useCreateXxxModal`
- `scripts/*draft*.js` -> `features/*/model/useXxxDrafts`
- `scripts/*bulk*.js` -> `features/*/model/useXxxBulkActions`
- `sections/*.html` -> `features/*/ui/*` 组件
- `shared/shell/*.html` -> `shared/ui/AppShell` 及其子组件
- `shared/styles/*` -> design tokens / shared UI styles

如模块不适合完全照抄客户页命名，保持同一层次关系即可，不必强制复制文件名。

## 9. demo-only 标注规则

以下内容若只用于原型演示，必须明确标记：

- localStorage 持久化
- 硬编码重复数据
- 静态 toast 成功文案
- 假数据表格行
- 伪提交行为

manifest 建议字段：

- `demoOnly: true`
- `demoReplacement: "未来真实方案"`

## 10. 回归清单规则

回归项只写“用户可见行为”，不要写实现细节。

推荐覆盖：

- 页面主区块是否完整
- 核心字段是否齐全
- 搜索/筛选是否存在并可交互
- 关键按钮启用态是否正确
- 批量选择与批量动作是否保留
- modal 打开/关闭/保存/恢复是否正常
- toast 场景是否保留
- 响应式与导航是否回归

## 11. 推荐工作流

1. 读取规格与入口页
2. 画出 section / script / data / shared 四象限清单
3. 先写 `P0-CONTRACT.md`
4. 再写 `SPLIT-ARCHITECTURE.md`
5. 再写 `MIGRATION-MAPPING.md`
6. 最后补 `split-manifest.json`
7. 如果模块还未真正拆目录，使用脚手架脚本创建骨架

## 12. 命名建议

- section 文件名用页面语义：`header.html`, `filters.html`, `table.html`
- script 文件名用“模块名 + 能力”：`case-page.js`, `case-modal.js`
- data 文件名用“模块名 + config/data”：`case-config.js`, `case-demo-data.js`
- 文档名保持固定：`P0-CONTRACT.md`, `SPLIT-ARCHITECTURE.md`, `MIGRATION-MAPPING.md`
- 机器清单统一用 `split-manifest.json`

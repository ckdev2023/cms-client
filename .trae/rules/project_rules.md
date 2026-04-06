## 工作流（强制）

- 所有代码改动必须能通过 `npm run guard`
- 代码提交前先运行 `npm run fix`，再运行 `npm run guard`
- 禁止在页面/组件里堆业务逻辑；业务逻辑放在 feature 的 model 层（Hook/ViewModel）
- domain 层只放纯 TypeScript（类型/实体/接口），不得依赖 React Native、导航、网络实现
- data 层实现 domain 接口；infra 只提供通用能力（HTTP/存储/日志），不得反向依赖业务
- 新增/修改逻辑必须补单测；优先对 model/domain/data 做单测

## 厚门禁（本地自动）

- pre-commit：自动格式化与 eslint 修复（lint-staged）
- commit-msg：commitlint（conventional commits）
- pre-push：先执行 `npm run guard`；失败则执行 `npm run fix`，若产生文件变更则阻断推送（要求先提交），否则重跑 `npm run guard`

## 架构门禁（强制）

- `npm run guard` 包含依赖巡检（循环依赖、分层约束、跨层 import）
- feature 层禁止直接依赖 data/infra（只能通过 app container + domain/shared 协作）
- feature 层禁止直接依赖 tamagui / @tamagui/\*（必须通过 shared/ui 封装组件使用）
- domain/data 禁止依赖 shared/ui（UI 只能在 app/features/shared/ui 层使用）
- feature 之间禁止直接互相依赖（新增 feature 自动生效）；跨 feature 协作必须走 domain/shared 或由对方提供 public 出口

## 编码规范（默认）

- TypeScript 优先，开启 strict
- 不新增注释（除非明确要求）
- 单文件最大 500 行（TS/TSX），超过必须拆分子文件；门禁由 eslint 强制
- 每个方法遵守单一职责，控制复杂度与长度，避免把过多业务/流程逻辑堆在一个方法里；门禁由 eslint 强制
- 不引入未经仓库现有依赖的库；需要新增依赖时同步补测试与门禁脚本
- 禁止在测试中发起真实网络请求（必须 mock fetch 或使用注入 stub）；门禁由 jest setup 强制
- 禁止提交疑似敏感信息（token/密钥/密码片段等）；门禁由 secrets 扫描脚本强制
- 锁文件一致性：仅允许 npm（必须存在 package-lock.json，禁止 yarn.lock/pnpm-lock.yaml 等）；门禁由 lock 检查脚本强制

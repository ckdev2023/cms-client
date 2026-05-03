# Backlog — Incremental Analysis (v1)

> 此 backlog 列出"下一阶段需要做的分析任务"，**不是实施 plan**，不指导改代码。
> 任务格式：
> - **ID**：稳定引用
> - **目标**：要回答的具体问题
> - **方法**：用什么工具/读哪些文件
> - **产出**：写到 `.agent/analysis/` 哪个文件
> - **优先级**：P0 = 阻塞下一轮决策；P1 = 影响范围估计；P2 = 长期清单

## P0 —— 量化 & 拆分前置

### B-001 量化 `cases.service.ts` 的内部职责切片
- 目标：把 3456 行拆成"职责簇"，统计每簇行数与彼此依赖。
- 方法：按 export / private function 分组；统计 import 来源；不修改代码。
- 产出：`.agent/analysis/02-cases-service-anatomy.md`
- 优先级：P0

### B-002 用 dependency-cruiser 输出真实模块依赖图
- 目标：产出 server/admin/mobile 三套模块依赖 JSON，确定真实扇入 Top N。
- 方法：在三个 workspace 各跑一次 `depcruise --output-type json`，离线分析（不入库）。
- 产出：`.agent/analysis/03-dependency-graph.md`（含 Top 20 高扇入文件）
- 优先级：P0

### B-003 `app.module.ts` 装配清单的功能分组
- 目标：把 ~50 个 controller/service 按业务/能力分组（已隐含 core vs portal vs templates vs feature-flags）；为后续 NestModule 拆分提供事实底稿。
- 方法：仅读 `app.module.ts` + 每个 controller 的 `@Controller("...")` 前缀。
- 产出：`.agent/analysis/05-server-module-grouping.md`
- 优先级：P0

### B-004 `drizzle/schema.ts` 表清单 + RLS / migration 对应矩阵
- 目标：列出 schema.ts 中所有 `pgTable` 名 → 对应 migration 文件（基于 `001_init.sql` … `079*`）。
- 方法：grep `pgTable\("([^"]+)"` 与 migration `CREATE TABLE`；构建对应矩阵。
- 产出：`.agent/analysis/07-schema-migration-matrix.md`
- 优先级：P0

## P1 —— 边界与约束的对账

### B-005 admin 实际架构边界
- 目标：弄清 admin 是否有 mobile 一样的 feature/domain/data 强分层，还是另一套（views/* + repositoryRuntime）。
- 方法：阅读 `packages/admin/.dependency-cruiser.js`、`repositoryRuntime.architecture-guard.test.ts`、`crossModuleGates.test.ts`。
- 产出：补 `00-repo-survey.md` §2.1 + 新建 `08-admin-architecture.md`
- 优先级：P1

### B-006 mobile feature-boundary 守卫规则提取
- 目标：把 `scripts/checkFeatureBoundaries.cjs` + `.dependency-cruiser.js` 中的禁止规则汇总成一份事实清单。
- 方法：仅读两文件。
- 产出：`.agent/analysis/09-mobile-architecture-rules.md`
- 优先级：P1

### B-007 server `core` vs `portal` 的 API 路径与 guard 区分
- 方法：grep `@Controller(` 在 `core/**` 与 `portal/**` 下；列出路径前缀；列出哪些 controller 用 `AppUserAuthGuard`。
- 产出：`10-core-vs-portal.md`
- 优先级：P1

### B-008 `templates` ↔ `cases` 耦合点
- 方法：在 `cases.service.ts` 内 grep `TEMPLATES_RESOLVER` / `templatesService`；列出调用点与签名。
- 产出：`02-cases-service-anatomy.md` 附录
- 优先级：P1

### B-009 i18n 跨语言契约对账
- 方法：跑 `i18n-no-untranslated-group.test.ts`、`i18n-contract.test.ts`，提取它们断言的 schema。
- 产出：`11-i18n-contract.md`
- 优先级：P1

### B-010 测试 ownership / 命名规范图谱
- 方法：grep `*.bug*.test.ts`、`*.focused.test.ts`、`*.regression-*.test.ts`、`*.contract*.test.ts` 的命名分布；阅读已有的 `TEST-OWNERSHIP.md`、`P0/P1-DOWNSTREAM-VALIDATION-SET.md`。
- 产出：`12-test-taxonomy.md`
- 优先级：P1

## P2 —— 健康度与文档对齐

### B-011 大文件违例清单（>500 行）
- 方法：在三个 src 下用 `find + wc -l` 列出所有 >500 行的非测试 .ts/.tsx/.vue 文件。
- 产出：`04-risk-hotspots.md` 的附录小节"500 行违例总览"
- 优先级：P2

### B-012 锁文件 / TypeScript 版本现状澄清
- 方法：检查 `packages/mobile/package-lock.json` 是否仍被使用；列出 admin TS 6 vs server/mobile TS 5.9 的 caveat。
- 产出：补 `06-open-questions.md` 的 OQ-03/OQ-04
- 优先级：P2

### B-013 `prototype` 是否被生产代码引用
- 方法：在 admin/mobile/server `src/` 内 grep `prototype/`。
- 产出：补 `06-open-questions.md` OQ-01
- 优先级：P2

### B-014 业务规范"权威源"地图
- 方法：阅读 `docs/gyoseishoshi_saas_md/README.md`、`AGENTS.md`、`docs/事务所流程/` 顶层 README（如有）。
- 产出：`13-knowledge-base-map.md`
- 优先级：P2

### B-015 `feature-flags` 横切耦合面
- 方法：grep `featureFlagsService`、`FEATURE_FLAGS` 常量，列出被注入的 service。
- 产出：`14-feature-flags-fanout.md`
- 优先级：P2

### B-016 集成测试稳定性现状
- 方法：阅读 `tests/integration-pg/setup.ts` + `docker-compose.integration.yml`；评估 guard 时长与外部依赖。
- 产出：`15-integration-test-health.md`
- 优先级：P2

## 反向约束（提醒）

- 本 backlog 中**没有任何**改动业务代码、改动测试、改动构建配置的任务。
- 凡是产生新认识，更新 `00-repo-survey.md` / `module-index.json` / `04-risk-hotspots.md` / `06-open-questions.md` 即可，**不写实施 plan**。
- 任何分析中遇到模糊信号，必须降级为 Low confidence 并入 OQ。

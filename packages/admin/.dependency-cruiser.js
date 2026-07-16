export default {
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
    // 必须开启：默认 false 时 depcruise 只看运行时 import，对 type-only import
    // 完全失明——admin 实测因此漏看 745 条依赖，连既有的 no-circular 都抓不到
    // 三个 type 环（leads / customers / cases 各一）。server 侧已于 S5 开启，
    // 此处补齐，两端口径一致。
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "node_modules",
    },
  },
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "features-no-data-or-infra",
      severity: "error",
      from: { path: "^src/features" },
      to: { path: "^src/(data|infra)" },
    },
    {
      name: "features-no-cross-dependency",
      severity: "error",
      from: { path: "^src/features/([^/]+)/.+" },
      to: {
        path: "^src/features/([^/]+)/.+",
        pathNot: "^src/features/$1/.+",
      },
    },
    {
      name: "domain-no-local-outside-domain-or-shared",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(?!domain|shared)" },
    },
    {
      name: "domain-no-shared-ui",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/shared/ui" },
    },
    {
      name: "domain-no-npm",
      severity: "warn", // Domain usually shouldn't depend on npm, but might need it sometimes
      from: { path: "^src/domain" },
      to: { dependencyTypes: ["npm"] },
    },
    {
      name: "shared-no-local-outside-shared",
      severity: "error",
      from: { path: "^src/shared" },
      to: { path: "^src/(?!shared)" },
    },
    {
      name: "infra-no-app-or-features-or-domain-or-data",
      severity: "error",
      from: { path: "^src/infra" },
      to: { path: "^src/(app|features|domain|data|views|components)" },
    },
    {
      name: "data-no-app-or-features",
      severity: "error",
      from: { path: "^src/data" },
      to: { path: "^src/(app|features|views|components)" },
    },
    {
      name: "data-no-shared-ui",
      severity: "error",
      from: { path: "^src/data" },
      to: { path: "^src/shared/ui" },
    },
    {
      name: "billing-no-cases",
      severity: "error",
      from: { path: "^src/views/billing" },
      to: { path: "^src/views/cases" },
    },
    {
      name: "cases-internals-are-module-private",
      comment:
        "B2：views/cases 对外只暴露 public.ts；模块外不得 import cases 内部路径。" +
        "例外：router/index.ts（路由懒加载入口——三个 View 是模块的路由入口点而非" +
        "内部实现，方案书明示「不改路由懒加载入口」，对应 server 侧 app.module.ts " +
        "作为 DI 组装根的豁免）；测试与 test-support。" +
        "B6 收口：原唯一常驻 warn（shell/searchFixtures.ts 跨 5 模块直引各自 " +
        "fixtures）已改名 searchFixtures.test-support.ts——实测它无任何生产消费方，" +
        "唯一使用者是 searchRepository.test.ts，改名后归入 test-support 豁免。" +
        "违规清零，severity 由 warn 升 error。",
      severity: "error",
      from: {
        path: "^src",
        pathNot:
          "^src/views/cases|^src/router/index\\.ts$|\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/views/cases/(?!public)" },
    },
    {
      name: "cases-fixtures-are-test-only",
      comment:
        "B6：views/cases/__fixtures__ 是样例数据，只允许测试 / test-support 引用。" +
        "例外 views/cases/create/repository.ts：它导出 createMockCaseRepository，被生产的 " +
        "CaseCreateView.vue 调用（新建向导的 templates / viewer 仍取自 fixture 而非 " +
        "API）。B5「create/ 成域」按纯结构搬迁执行：repository.ts 实测生产侧只有 " +
        "CaseCreateView.vue 一个消费方，故随 create/ 迁入，豁免路径同步改指——债被收进 " +
        "create/ 且仍是唯一显式豁免，阻止新的生产代码再引 fixtures。" +
        "切断该 fixture 依赖需要 viewer / createTemplates / familyScenario 三处改走 API，" +
        "属行为变更（另需服务端端点），不在重构批次内；留待单独决策与排期。",
      severity: "error",
      from: {
        path: "^src",
        pathNot:
          "\\.test\\.ts$|test-support|test-fixtures|^src/views/cases/__fixtures__|^src/views/cases/create/repository\\.ts$",
      },
      to: { path: "^src/views/cases/__fixtures__" },
    },
  ],
};

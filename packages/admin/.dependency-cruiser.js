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
        "shell/searchFixtures.ts 未豁免：它直引 cases/fixtures，是放在生产路径下的" +
        "跨模块 fixture 聚合器，本规则以 warn 把它显性挂账，由 B6 的「fixtures " +
        "仅测试可 import」规则一并收口。" +
        "迁移期 warn，B6 收口批升 error。",
      severity: "warn",
      from: {
        path: "^src",
        pathNot:
          "^src/views/cases|^src/router/index\\.ts$|\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/views/cases/(?!public)" },
    },
  ],
};

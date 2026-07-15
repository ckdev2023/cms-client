module.exports = {
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
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
      name: "config-no-local-outside-config",
      severity: "error",
      from: { path: "^src/config" },
      to: { path: "^src/(?!config)" },
    },
    {
      name: "infra-no-local-outside-infra-or-config",
      severity: "error",
      from: { path: "^src/infra" },
      to: { path: "^src/(?!infra|config)" },
    },
    {
      name: "modules-core-no-import-templates-or-custom",
      severity: "error",
      from: { path: "^src/modules/core" },
      to: { path: "^src/modules/(templates|custom)" },
    },
    {
      name: "modules-core-no-import-portal",
      severity: "error",
      from: { path: "^src/modules/core" },
      to: {
        path: "^src/modules/portal",
        pathNot:
          "^src/modules/portal/(model/portalEntities|intake/intake\\.types)",
      },
    },
    {
      name: "cases-internals-are-module-private",
      comment:
        "S1: core/cases 对外只暴露 public/ 出口；模块外不得 import cases 内部文件。" +
        "例外：app.module（DI 组装根）、测试与 test-support/test-fixtures、" +
        "portal/intake/intake.types（与 cases 的双向类型接缝，见 modules-core-no-import-portal 白名单；" +
        "改走 barrel 会形成 intake.types → public → cases.service → intake.types 循环）。" +
        "S5 收口：全部消费方已迁至 public，规则由 warn 升为 error。",
      severity: "error",
      from: {
        path: "^src",
        pathNot:
          "^src/(modules/core/cases|app\\.module\\.ts|modules/portal/intake/intake\\.types\\.ts)|\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/modules/core/cases/(?!public/)" },
    },
    {
      name: "billing-no-import-cases",
      comment:
        "S5 解环：cases ↔ billing 的模块级双向依赖已解开，方向固定为 " +
        "cases → billing（收费引擎 billingGuards + BillingPlans/PaymentRecords 服务 + DTO）。" +
        "billing 需要的案件能力只通过自己声明的窄接口取得（caseEditGuard.ts 的 " +
        "CASE_EDIT_GUARD，由 app.module 用 useExisting 绑定到 CaseAccessService），" +
        "沿用 TEMPLATES_RESOLVER 的既有范式。billing 不得再 import cases。",
      severity: "error",
      from: {
        path: "^src/modules/core/billing",
        pathNot: "\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/modules/core/cases" },
    },
    {
      name: "modules-templates-no-import-custom",
      severity: "error",
      from: { path: "^src/modules/templates" },
      to: { path: "^src/modules/custom" },
    },
    {
      name: "modules-feature-flags-no-import-custom",
      severity: "error",
      from: { path: "^src/modules/feature-flags" },
      to: { path: "^src/modules/custom" },
    },
  ],
};

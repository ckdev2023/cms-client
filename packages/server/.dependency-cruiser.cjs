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
      name: "cases-no-import-residence-periods",
      comment:
        "S5 解环：cases ↔ residence-periods 的模块环已解开，方向固定为 " +
        "residence-periods → cases/public（模板与类型是 cases 领地）。" +
        "cases 详情聚合所需的在留期间行映射已移入共享内核 " +
        "core/model/residencePeriodMappers（ResidencePeriod 实体本就在同目录），" +
        "两侧平等取用。cases 不得再 import residence-periods。",
      severity: "error",
      from: {
        path: "^src/modules/core/cases",
        pathNot: "\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/modules/core/residence-periods" },
    },
    {
      name: "cases-no-import-customers",
      comment:
        "S5 解环：cases ↔ customers 的模块环已解开，方向固定为 " +
        "customers → cases/public（建案能力是 cases 领地，customers.service 建案走 CasesService）。" +
        "cases 侧对 customers 的全部依赖恰好只是 BMV 承接档案解析链（refs-resolver 取 " +
        "resolveCustomerBmvProfile、types-bmv-gate 取四个状态类型），已移入共享内核 " +
        "core/model/customerBmvProfile —— Customer 实体本就定义在同目录 coreEntities.ts，" +
        "其 base_profile 子文档的解析理应与实体同处，供 customers / cases / core-leads / " +
        "portal-leads 四方平等取用（同 residencePeriodMappers 的归属理由）。" +
        "cases 不得再 import customers。",
      severity: "error",
      from: {
        path: "^src/modules/core/cases",
        pathNot: "\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/modules/core/customers" },
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

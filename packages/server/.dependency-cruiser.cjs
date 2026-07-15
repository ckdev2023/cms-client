module.exports = {
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
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
        "迁移期 warn，收口批（S5）升级为 error。",
      severity: "warn",
      from: {
        path: "^src",
        pathNot:
          "^src/(modules/core/cases|app\\.module\\.ts|modules/portal/intake/intake\\.types\\.ts)|\\.test\\.ts$|test-support|test-fixtures",
      },
      to: { path: "^src/modules/core/cases/(?!public/)" },
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

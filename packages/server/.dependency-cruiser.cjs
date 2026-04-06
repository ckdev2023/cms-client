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

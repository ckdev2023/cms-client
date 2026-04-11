export default {
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
  ],
};

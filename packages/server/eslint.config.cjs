const js = require("@eslint/js");
const globals = require("globals");
const jsdocPlugin = require("eslint-plugin-jsdoc");
const prettierConfig = require("eslint-config-prettier");
const tseslint = require("typescript-eslint");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "drizzle/meta/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-else-return": ["error", { allowElseIf: false }],
      "no-lonely-if": "error",
      "no-implicit-coercion": "error",
      "no-console": "error",
      "max-lines": [
        "error",
        {
          max: 500,
          skipBlankLines: false,
          skipComments: false,
        },
      ],
      "max-lines-per-function": [
        "error",
        {
          max: 60,
          skipBlankLines: false,
          skipComments: false,
        },
      ],
      complexity: ["error", 12],
      "max-depth": ["error", 4],
      "max-statements": ["error", 30],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-definitions": "off",
      // cases 拆分 S3：流转轴与 gate 编排已落位 flow/ 子域，旧扁平路径的
      // 迁移垫片已删除。此处封禁旧路径，防止新代码（或 AI 依据过时记忆）
      // 重新引入已消失的模块，把结构退回扁平状态。
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/cases.service.transition-gates",
                "**/cases.service.gate-c-open-tasks",
              ],
              message:
                "已迁至 cases/flow/stage/（S3）：请从 flow/stage/stageTransitionGates 或 flow/stage/gateCOpenTasks 导入。",
            },
            {
              group: ["**/cases.service.phase-effects"],
              message: "已迁至 cases/flow/phase/phaseEffects（S3）。",
            },
            {
              group: [
                "**/cases.workflow-step",
                "**/cases.workflow-step-readmodel",
              ],
              message:
                "已迁至 cases/flow/workflow-step/（S3）：请从 flow/workflow-step/workflowStep 或 flow/workflow-step/workflowStepReadModel 导入。",
            },
            {
              group: ["**/cases.service.billing-gates"],
              message:
                "已迁至 cases/flow/billingGates（S3）。注意：gate 编排在 cases/flow，收费引擎仍在 core/billing/billingGuards。",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='String'][arguments.0.type='MemberExpression'][arguments.0.property.name=/^.*_at$/]",
          message:
            "禁止对时间戳列直接 String() 透传 Date.prototype.toString()。改用 core/model/timestamps.ts 的 requireTimestampString / toTimestampStringOrNull（BUG-135）。",
        },
      ],
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          contexts: [
            "FunctionDeclaration",
            "TSDeclareFunction",
            "ClassDeclaration",
            "MethodDefinition",
            "PropertyDefinition",
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSEnumDeclaration",
          ],
        },
      ],
      "jsdoc/require-description": "error",
      "jsdoc/require-param": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-description": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/**/*.module.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    files: ["**/*.{test,spec}.ts"],
    rules: {
      "max-lines-per-function": "off",
      complexity: "off",
      "max-statements": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-description": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off",
      "max-lines-per-function": "off",
      complexity: "off",
      "max-statements": "off",
    },
  },
  prettierConfig,
];

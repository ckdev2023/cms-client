import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";
import prettierConfig from "@vue/eslint-config-prettier";
import jsdocPlugin from "eslint-plugin-jsdoc";

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
  },
  ...pluginVue.configs["flat/essential"],
  ...vueTsEslintConfig(),
  prettierConfig,
  {
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
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
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "vue/multi-word-component-names": "off",
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
            "TSMethodSignature",
            "TSPropertySignature",
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
    files: ["src/features/**/*.{ts,tsx,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "tamagui",
              message:
                "feature 层禁止直接依赖 tamagui，请通过 @shared/ui 封装组件使用",
            },
          ],
          patterns: [
            {
              group: ["@tamagui/*"],
              message:
                "feature 层禁止直接依赖 @tamagui/*，请通过 @shared/ui 封装组件使用",
            },
            {
              group: ["@/data/*", "@/infra/*"],
              message:
                "feature 层禁止直接依赖 data/infra（只能通过 app container + domain/shared 协作）",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/shared/ui/*"],
              message:
                "domain/data 禁止依赖 shared/ui（UI 只能在 app/features/shared/ui 层使用）",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "max-lines-per-function": "off",
      complexity: "off",
      "max-statements": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

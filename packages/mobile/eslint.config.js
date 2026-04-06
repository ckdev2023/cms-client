const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");
const jsdocPlugin = require("eslint-plugin-jsdoc");

module.exports = [
  ...expoConfig,
  {
    files: ["tamagui.config.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
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
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
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
    files: ["src/infra/log/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["scripts/**/*.{js,cjs,mjs}"],
    rules: {
      "no-console": "off",
      "no-undef": "off",
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
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
    },
  },
  prettierConfig,
];

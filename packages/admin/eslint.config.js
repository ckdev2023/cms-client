import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";
import prettierConfig from "@vue/eslint-config-prettier";
import jsdocPlugin from "eslint-plugin-jsdoc";

/**
 * cases 模块的通用路径封禁（适用于 cases 下所有文件，含 __fixtures__）。
 *
 * 抽成常量是为了让下面两个块共享同一份清单：flat config 里同 scope 的多个块若都设
 * no-restricted-imports，后者整体覆盖前者而非合并，所以不能靠「再加一块」来补规则；
 * 而 __fixtures__ 又必须豁免 shim 封禁（理由见 CASES_FIXTURES_SHIM_BAN）。
 * 于是拆成两个**互不重叠**的 scope，各自声明一次，公共部分走这个常量避免漂移。
 */
const CASES_RESTRICTED_PATTERNS = [
  {
    group: ["**/CaseTimelineBuilders", "**/CaseTimelineBuilders.ts"],
    message:
      "CaseTimelineBuilders は削除済み。CaseCommsTimelineBuilders を使用してください（ADR-007）",
  },
  {
    group: [
      "**/model/CaseRepository",
      "**/model/CaseRepository.ts",
      "**/model/CaseRepositoryFactories",
      "**/model/CaseRepositoryReadSide",
      "**/model/CaseRepositorySupport",
      "**/model/CaseRepositoryWriteSide",
    ],
    message:
      "CaseRepository* 已迁至 views/cases/api/（拆分 B1）。请从 api/ 引用；model/ 只保留视图模型与 adapter。",
  },
  {
    // 注意：no-restricted-imports 匹配的是 import 语句里写的字面路径，
    // 不是解析后的路径。cases 内部写的是 "./types-detail"，用
    // "**/cases/types-detail" 永远匹配不到——探针实测发现。
    group: ["**/types-detail", "**/types-detail.ts"],
    message:
      "types-detail 类型枢纽已按 Tab 拆解（B3）：Tab 类型→detail/tabs/<tab>/types，聚合根→detail/types-detail-core，原语与枚举→types-core。旧路径已删除，勿重建。",
  },
  {
    // BMV 步骤常量原在 cases 根、两个 Section 原在 components/（B5 迁入 bmv/）。
    //
    // 只列 "../" 及更深的形式，**故意不列 "./constantsBmvSteps"**：bmv/ 内的兄弟
    // 文件（CaseWorkflowStepSection.vue 与 3 个 focused 测试）正当地写这个字面量，
    // 与「cases 根旧路径」完全同形，ESLint 只看字面量、无从区分——同 __fixtures__
    // 的处境。而从 cases 根再写 "./constantsBmvSteps" 已无文件可解析，vue-tsc/vite
    // 会直接报错，不需要本规则兜底。
    //
    // 两个 Section 则反过来：靠 "components/" 这个字面段与新路径
    // "../../../bmv/CaseWorkflowStepSection.vue" 区分，不会误伤。
    group: [
      "../constantsBmvSteps",
      "../constantsBmvSteps.ts",
      "../../constantsBmvSteps",
      "../../constantsBmvSteps.ts",
      "../../../constantsBmvSteps",
      "../../../constantsBmvSteps.ts",
      "**/components/CaseWorkflowStepSection.vue",
      "**/components/CaseSurveyQuoteSection.vue",
    ],
    message:
      "BMV 步骤常量与 Workflow/SurveyQuote 两个 Section 已迁至 views/cases/bmv/（拆分 B5）。请从 bmv/ 引用。旧路径已删除，勿重建。",
  },
];

/**
 * B1 建的 fixtures 垫片（cases/fixtures*.ts）封禁，B6 已删除这些垫片。
 *
 * 只列「相对点号 + 直接跟 fixtures」的形式，两个原因：
 * 1) 同 types-detail：匹配的是字面量，cases 内部写 "./fixtures" / "../fixtures" /
 *    "../../../fixtures-detail"，用 "**\/cases/fixtures" 匹配不到。
 * 2) 不能图省事写 "**\/fixtures"——`**` 会吃掉 "./__fixtures__"，连合法的
 *    "./__fixtures__/fixtures" 一起封禁（探针实测确认会误伤）。
 *
 * 本条不适用于 __fixtures__ 目录自身：该目录内的文件互相 import 同目录兄弟
 * （fixtures-create.ts → "./fixtures-create-bmv"），字面量与旧垫片路径完全同形，
 * ESLint 只看字面量、无从区分。故 __fixtures__ 单列一个 scope 且不含本条。
 */
const CASES_FIXTURES_SHIM_BAN = {
  group: [
    "./fixtures",
    "./fixtures-*",
    "../fixtures",
    "../fixtures-*",
    "../../fixtures",
    "../../fixtures-*",
    "../../../fixtures",
    "../../../fixtures-*",
  ],
  message:
    "cases 样例数据已迁至 views/cases/__fixtures__/（B1 建垫片，B6 删）。请改从 __fixtures__/ 引用，且仅测试 / test-support 可 import（depcruise: cases-fixtures-are-test-only）。旧垫片路径已删除，勿重建。",
};

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
    // cases 模块（不含 __fixtures__）的路径封禁集中在此唯一块内。
    //
    // 注意（flat config 语义）：同 scope 的多个块若都设 no-restricted-imports，
    // 后者整体覆盖前者而非合并。此前 CaseTimelineBuilders 封禁重复成两块，
    // 前一块实为死代码；新增封禁若另起一块会静默废掉既有规则，故必须并入本块。
    // 下面的 __fixtures__ 块靠 ignores 与本块**互不重叠**，因此不构成覆盖。
    files: ["src/views/cases/**/*.{ts,tsx,vue}"],
    ignores: ["src/views/cases/__fixtures__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...CASES_RESTRICTED_PATTERNS, CASES_FIXTURES_SHIM_BAN] },
      ],
    },
  },
  {
    // __fixtures__ 自身：同目录兄弟 import 的字面量与旧垫片路径同形
    // （fixtures-create.ts → "./fixtures-create-bmv"），故本 scope 不含
    // shim 封禁，其余 cases 封禁照旧。与上一块经 ignores 严格互斥。
    files: ["src/views/cases/__fixtures__/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: CASES_RESTRICTED_PATTERNS },
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
      // 禁止 `describe.skip` / `it.skip` / `test.skip` 与 `xdescribe` / `xit` / `xtest`
      // 直接合入 main——R5/R8/R9 三轮回归同一条「caseNo 透传」链路均因为
      // 关键单测被 `describe.skip` 默默关掉而漏过。
      // 存量例外用 `// eslint-disable-next-line no-restricted-syntax` + 跟踪 BUG/issue 注释豁免。
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name=/^(describe|it|test|suite)$/][property.name='skip']",
          message:
            "禁止合入被 skip 的测试（describe.skip / it.skip / test.skip）；如需临时禁用请挂跟踪 BUG/issue 注释并 eslint-disable-next-line。",
        },
        {
          selector: "CallExpression[callee.name=/^(xdescribe|xit|xtest)$/]",
          message:
            "禁止合入被 skip 的测试（xdescribe / xit / xtest）；如需临时禁用请挂跟踪 BUG/issue 注释并 eslint-disable-next-line。",
        },
      ],
    },
  },
];

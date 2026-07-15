/**
 * `views/cases` 模块对外公共出口（admin 拆分 B2）。
 *
 * 规则：模块外代码（其他 views/* 模块、shell、dashboard）只能从本文件 import
 * cases 能力；直接引用 cases 内部路径属于架构违例，由 dependency-cruiser 规则
 * `cases-internals-are-module-private` 检查（B2 迁移期 warn，B6 收口批升 error）。
 *
 * 例外：
 * - `router/index.ts` —— 路由懒加载入口（`CaseListView` / `CaseCreateView` /
 *   `CaseDetailView` 三个 View 是模块的路由入口点，非内部实现；方案书明示
 *   「不改路由懒加载入口」）。对应 server 侧 `app.module.ts` 作为 DI 组装根的豁免。
 * - 测试与 fixture 聚合器 —— 见规则注释。
 *
 * 本文件只做 re-export，不承载任何逻辑。新增对外符号时优先评估「消费方是否
 * 真的需要」，避免把内部实现细节升格为公共契约。
 */

// ── 路由构建器（跨模块 link 契约）────────────────────────────────
// 9 处外部消费的主体。口径锚定 query.ts 的 CASE_CROSS_MODULE_LINK_CONTRACT
// （冻结面，14 个跨模块消费者依赖其路径形态），该常量本身仅模块内测试消费，
// 不对外导出。
export {
  buildCaseCreateHref,
  buildCaseCreateRoute,
  buildCaseDetailHref,
  buildCaseDetailRoute,
  buildCaseListHref,
} from "./query";
export type { CaseCreateQueryParams } from "./query";

// ── 阶段徽标（customers 的案件 Tab 消费）────────────────────────
// 架构报告点名的既有越界：customers 此前直接 import
// `cases/components/StageChip.vue`。B2 先经 public 导出使其合法且可审；
// 是否下沉到 shared/ui 作为通用徽标，留待后续独立评估——它当前依赖
// cases 的 stage 常量，下沉需一并处理该耦合，不在本批范围。
export { default as StageChip } from "./components/StageChip.vue";

// ── 资料域共享类型（documents 消费）──────────────────────────────
// 架构报告点名的既有越界：documents 反向 import `cases/types-detail`。
// B2 先经 public 导出使其合法；这批类型描述的是资料项本身（documents 的
// 领域概念），长期正解是抽到 documents 自己的 model 或 shared，由 documents
// 反向提供给 cases——但那是 documents 侧的重构，且会触碰 B3 的 types-detail
// 拆解面，故不在本批夹带。
export type {
  DocumentFileVersion,
  DocumentItem,
  DocumentItemActions,
  DocumentReminderRecord,
  DocumentReviewRecord,
} from "./detail/tabs/documents/types";

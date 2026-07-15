/**
 * cases 测试的统一时钟锚点——**副作用导入**模块。
 *
 * 用法（在测试文件顶部）：
 * ```ts
 * import "./casesTestClock";
 * ```
 * 导入即注册 beforeEach/afterEach，把系统时钟冻结到 {@link CASES_TEST_NOW}。
 * 与 `import "@testing-library/jest-dom"` 同属测试生态的副作用导入惯例。
 *
 * 为什么需要：`isDeadlineDanger`（±7 日）、`resolveResidenceTone`（90/0 日）、
 * `resolveResidenceStatusLabel`（30/90/180 日）、`computeRemaining`、
 * `deriveDueColor`（3 日）、`isSupplementDeadlineUrgent`（7 日）等适配器逻辑
 * 都直接读真实系统时钟。测试若用固定日期 fixture 而不冻结时钟，随着真实时间
 * 流逝 fixture 会越过阈值，测试从通过变失败——即「日期时间炸弹」。
 * 2026-07-15 已有两个此类测试爆雷（dueAt=2026-06-01 越过 ±7 日窗口）。
 *
 * 锚点取值理由：2026-04-26 早于全仓所有未来向 fixture（dueAt / validUntil /
 * supplementDeadline），且晚于所有过去向 fixture（acceptedAt /
 * lastSupplementNoticeDate），是让 cases 全部日期 fixture 语义同时成立的
 * 一致锚点，并与既有已冻结测试（2026-04-20 / 2026-04-26）同代。
 *
 * 只伪造 `Date`（`toFake`），不接管 setTimeout/setInterval 与微任务队列——
 * 含 `nextTick` + async 写操作的测试文件因此也能安全使用。
 * 基于相对日期（now ± N 天）构造 fixture 的用例在假时钟下语义不变。
 *
 * **为何必须在模块作用域冻结、而不能只靠 beforeEach**：本目录多个测试在
 * `describe` 体内直接算 `const result = adaptCaseDetailAggregate(...)`。
 * describe 回调在**收集阶段**执行，早于任何 beforeEach 钩子——只在 beforeEach
 * 冻结的话，适配器早已用真实时钟算完，冻结完全无效（且测试照常"通过"，
 * 具有极强的迷惑性）。ES import 在导入方模块体求值前完成，故在此处于模块
 * 作用域先冻一次，收集期的计算即可读到假时钟；beforeEach 再为逐个用例续冻。
 */
import { afterEach, beforeEach, vi } from "vitest";

/** cases 测试统一的「现在」。 */
export const CASES_TEST_NOW = "2026-04-26T00:00:00Z";

function freeze(): void {
  vi.useFakeTimers({ now: new Date(CASES_TEST_NOW), toFake: ["Date"] });
}

// 收集阶段（describe 体内的适配器调用）即需假时钟——见上方说明。
freeze();

beforeEach(freeze);

afterEach(() => {
  vi.useRealTimers();
});

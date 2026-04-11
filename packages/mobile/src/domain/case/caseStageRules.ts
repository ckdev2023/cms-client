import type { CaseStage } from "./Case";

/**
 * P0 案件阶段合法流转矩阵（§3.1 + §04-核心流程）。
 *
 * S7 の補正循環は主ステージを変えない —
 * SubmissionPackage(supplement) で新ラウンドを表現する。
 */
const VALID_STAGE_TRANSITIONS: Record<CaseStage, CaseStage[]> = {
  S1: ["S2"],
  S2: ["S3"],
  S3: ["S2", "S4"],
  S4: ["S5"],
  S5: ["S3", "S4", "S6"],
  S6: ["S7"],
  S7: ["S8"],
  S8: ["S9"],
  S9: [],
};

/**
 * ステージ遷移が合法かどうかを判定する。
 *
 * @param from - 現在のステージ
 * @param to - 遷移先のステージ
 * @returns 合法なら true
 */
export function isValidStageTransition(
  from: CaseStage,
  to: CaseStage,
): boolean {
  return VALID_STAGE_TRANSITIONS[from]?.includes(to) === true;
}

/**
 * ステージが終端（S9）かどうかを判定する。
 *
 * @param stage - 判定対象のステージ
 * @returns S9 なら true
 */
export function isTerminalStage(stage: CaseStage): boolean {
  return stage === "S9";
}

/**
 * 指定ステージから遷移可能な次ステージ一覧を返す。
 *
 * @param stage - 現在のステージ
 * @returns 遷移先ステージ配列
 */
export function nextStages(stage: CaseStage): readonly CaseStage[] {
  return VALID_STAGE_TRANSITIONS[stage] ?? [];
}

/**
 * S7 補正循環：案件は S7 のまま。補正発起が可能かどうかを判定する。
 *
 * @param stage - 現在のステージ
 * @returns S7 なら true
 */
export function canInitiateSupplement(stage: CaseStage): boolean {
  return stage === "S7";
}

/**
 * Gate-A 通過条件に対応するステージ推進（S3 → S4）かどうか。
 *
 * @param from - 現在のステージ
 * @param to - 遷移先のステージ
 * @returns Gate-A 遷移なら true
 */
export function isGateATransition(from: CaseStage, to: CaseStage): boolean {
  return from === "S3" && to === "S4";
}

/**
 * Gate-B 通過条件に対応するステージ推進（S4 → S5）かどうか。
 *
 * @param from - 現在のステージ
 * @param to - 遷移先のステージ
 * @returns Gate-B 遷移なら true
 */
export function isGateBTransition(from: CaseStage, to: CaseStage): boolean {
  return from === "S4" && to === "S5";
}

/**
 * Gate-C 通過条件に対応するステージ推進（S6 → S7）かどうか。
 *
 * @param from - 現在のステージ
 * @param to - 遷移先のステージ
 * @returns Gate-C 遷移なら true
 */
export function isGateCTransition(from: CaseStage, to: CaseStage): boolean {
  return from === "S6" && to === "S7";
}

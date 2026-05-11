/** 步骤二概要 chip 用的资料条数快照。 */
export type CaseCreateRequirementSnapshot = {
  /** 展示用总条数。 */
  total: number;
  /** 必填条数。 */
  required: number;
  /** fixtures 预览分段数量（占位）。 */
  sections: number;
};

/**
 * 合并 fixture 分项统计与服务端 checklist-preview（条数对齐蓝图）。
 *
 * @param params - 入参对象
 * @param params.fixtureTotal - fixtures 分项累计条数
 * @param params.fixtureRequired - fixtures 下必填项条数
 * @param params.sectionCount - fixtures 预览分段数（服务端无分段占位）
 * @param params.srvTotal - 服务端 checklist 总条数；未请求成功时为 `null`
 * @param params.srvRequired - 服务端必填条数；可为 `null`
 * @param params.previewState - checklist 预览 composable 的状态值；`empty` 时 chip 与 fixtures 示意条数对齐（服务端 0 条）。
 * @returns Step2 chip 展示的条数快照
 */
export function resolveCaseCreateRequirementSummary(params: {
  fixtureTotal: number;
  fixtureRequired: number;
  sectionCount: number;
  srvTotal: number | null;
  srvRequired: number | null;
  previewState: string | undefined;
}): CaseCreateRequirementSnapshot {
  const {
    fixtureTotal,
    fixtureRequired,
    sectionCount,
    srvTotal,
    srvRequired,
    previewState,
  } = params;

  if (previewState === "ok" && srvTotal !== null) {
    return {
      total: srvTotal,
      required: srvRequired ?? fixtureRequired,
      sections: sectionCount,
    };
  }
  if (previewState === "empty") {
    return {
      total: fixtureTotal,
      required: fixtureRequired,
      sections: sectionCount,
    };
  }
  return {
    total: fixtureTotal,
    required: fixtureRequired,
    sections: sectionCount,
  };
}

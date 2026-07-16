/**
 * 建案向导详情类型 —— 已随 `create/` 成域落位（B5）。
 *
 * 自 `types-detail.ts` 拆出（B3）时暂存于 `detail/`，单独成文件即为便于整文件移动；
 * B5 已按原计划迁入 `create/`，旧路径由 ESLint 封禁（勿在 detail/ 下重建）。
 *
 * 对外仍经 `types.ts` 再导出，模块外消费走 `public.ts`。
 */

/**
 *
 */
export interface CaseCreateCustomerOption {
  /**
   *
   */
  id: string;
  /** 客户业务编号，例如 `CUS-202604-0005`；部分合成/旧数据可能缺失。 */
  customerNumber?: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  kana: string;
  /**
   *
   */
  group: string;
  /**
   *
   */
  groupLabel: string;
  /**
   *
   */
  roleHint: string;
  /**
   *
   */
  summary: string;
  /**
   *
   */
  contact: string;

  // ─── P1 BMV Pre-Sign Gate Profile (p1-fe-003-02) ──────────────
  // 仅 BMV 顾客有值；创建案件时用于客户端预检签约前门禁。

  /** BMV 问卷回收状态。 */
  bmvQuestionnaireStatus?: string | null;
  /** BMV 报价确认状态。 */
  bmvQuoteStatus?: string | null;
  /** BMV 签约状态。 */
  bmvSignStatus?: string | null;
  /** BMV 承接就绪状态。 */
  bmvIntakeStatus?: string | null;
}

/**
 *
 */
export interface FamilyDraftParty {
  /**
   *
   */
  name: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  relation: string;
  /**
   *
   */
  contact: string;
  /**
   *
   */
  note: string;
  /**
   *
   */
  reuseDocs: string[];
  /**
   *
   */
  staleDocWarning?: string;
}

/**
 *
 */
export interface FamilyScenario {
  /**
   *
   */
  title: string;
  /**
   *
   */
  summary: string;
  /**
   *
   */
  roles: string[];
  /**
   *
   */
  defaultDraftParties: FamilyDraftParty[];
  /**
   *
   */
  reuseNotes: string[];
  /**
   *
   */
  gateChecks: string[];
}

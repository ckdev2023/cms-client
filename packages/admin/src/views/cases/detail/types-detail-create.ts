/**
 * 建案向导详情类型 —— B5 的暂存处，非最终归宿。
 *
 * 自 `types-detail.ts` 拆出（B3）。按方案书 B5，`create/` 成域须等活跃 P1 批次
 * 退出，故暂存于此；单独成文件是为了 B5 能整文件移动。
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

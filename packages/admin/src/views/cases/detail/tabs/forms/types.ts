/**
 * 文书 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

/** 生成文書の後端ステータス（三態）。 */
export type GeneratedDocumentBackendStatus =
  | "draft"
  | "final"
  | "exporting"
  | "exported"
  | "export_failed";

/**
 *
 */
export interface FormTemplate {
  /** server 側レコード ID。 */
  id: string;
  /**
   *
   */
  name: string;
  /**
   * 兜底用メタ文字列（構造化フィールドが利用できない場合のフォールバック）。
   */
  meta: string;
  /**
   *
   */
  actionLabel: string;
  /** i18n key — `cases.detail.forms.docType.<rawDocType>`；view 層で `t()` 翻訳。 */
  docTypeKey?: string;
  /** 後端原始 docType 文字列（i18n 未命中時のフォールバック）。 */
  docTypeRaw?: string;
  /** テンプレートの言語コード（ISO 639-1）。 */
  language?: string;
  /** テンプレートのバージョン番号。 */
  versionNo?: number;
}

/**
 *
 */
export interface FormGenerated {
  /** server 側レコード ID。 */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  meta: string;
  /**
   *
   */
  tone: string;
  /** 後端ステータス — finalize / export ボタン判定用。 */
  backendStatus: GeneratedDocumentBackendStatus;
  /** 生成ファイルの URL（`null` = 未生成）。 */
  fileUrl: string | null;
  /** `true` のとき fileUrl は placeholder プロトコルであり、ダウンロード不可。 */
  fileUrlIsPlaceholder: boolean;
  /**
   * ブラウザでダウンロード可能な URL — server `/generated-documents/:id/file` 経由のストリーミング。
   * status=`exported` かつ fileUrl が storage key の場合のみ非 null（レガシー）。
   */
  downloadUrl: string | null;
  /**
   * 外部リソース URL — status=`final` かつ fileUrl が http(s) 外部リンクの場合に設定。
   * UI は「リンクを開く」「リンクをコピー」で利用する。
   */
  resourceOpenUrl: string | null;
  /** 確定/出力操作者の表示名。 */
  approvedBy: string | null;
  /** 確定/出力日時（フォーマット済み表示用文字列）。 */
  approvedAt: string | null;
}

/**
 *
 */
export interface FormsData {
  /**
   *
   */
  templates: FormTemplate[];
  /**
   *
   */
  generated: FormGenerated[];
}

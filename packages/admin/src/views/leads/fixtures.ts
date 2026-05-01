import type {
  DedupPresets,
  LeadSummary,
  OwnerOption,
  SelectOption,
} from "./types";
import { getCurrentLocale, type AppLocale } from "../../i18n";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";

/* ------------------------------------------------------------------ */
/*  参照选项                                                           */
/* ------------------------------------------------------------------ */

export const GROUP_OPTIONS: SelectOption[] = getActiveGroupOptions();

export const OWNER_OPTIONS: OwnerOption[] = [
  {
    value: "suzuki",
    label: "铃木",
    initials: "铃",
    avatarClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "tanaka",
    label: "田中",
    initials: "田",
    avatarClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "sato",
    label: "佐藤",
    initials: "佐",
    avatarClass: "bg-amber-100 text-amber-700",
  },
];

export const BUSINESS_TYPE_OPTIONS: SelectOption[] = [
  {
    value: "highly-skilled",
    label: "leads.options.businessType.highlySkilled",
  },
  { value: "work-visa", label: "leads.options.businessType.workVisa" },
  { value: "family-stay", label: "leads.options.businessType.familyStay" },
  {
    value: "business-manager",
    label: "leads.options.businessType.businessManager",
  },
  { value: "permanent", label: "leads.options.businessType.permanent" },
  { value: "other", label: "leads.options.businessType.other" },
];

export const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { value: "web", label: "leads.options.source.web" },
  { value: "referral", label: "leads.options.source.referral" },
  { value: "walkin", label: "leads.options.source.walkin" },
  { value: "phone", label: "leads.options.source.phone" },
  { value: "other", label: "leads.options.source.other" },
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "ja", label: "leads.options.language.ja" },
  { value: "zh", label: "leads.options.language.zh" },
  { value: "en", label: "leads.options.language.en" },
  { value: "vi", label: "leads.options.language.vi" },
];

/* ------------------------------------------------------------------ */
/*  去重预置                                                           */
/* ------------------------------------------------------------------ */

export const DEDUP_PRESETS: DedupPresets = {
  phoneMatchLead: {
    type: "lead",
    matchField: "phone",
    matchValue: "080-1234-5678",
    matchedRecord: {
      id: "LEAD-2026-0023",
      name: "田中 花子",
      phone: "080-1234-5678",
      group: "东京一组",
      status: "following",
      statusLabel: "跟进中",
    },
    message:
      "该电话号码已存在于线索 LEAD-2026-0023（田中 花子），请确认是否继续创建。",
  },
  emailMatchCustomer: {
    type: "customer",
    matchField: "email",
    matchValue: "li.na@email.com",
    matchedRecord: {
      id: "CUS-2026-0181",
      name: "李娜",
      email: "li.na@email.com",
      group: "东京一组",
      summary: "已有客户档案，家族滞在更新",
    },
    message:
      "该邮箱已存在于客户档案 CUS-2026-0181（李娜），请确认是否继续创建新咨询。",
  },
};

/* ------------------------------------------------------------------ */
/*  列表页示例数据（8 条，覆盖 SPEC-GAP-MATRIX §8）                     */
/* ------------------------------------------------------------------ */

const LEAD_SAMPLES_BASE: LeadSummary[] = [
  {
    id: "LEAD-2026-0042",
    name: "Michael Thompson",
    phone: "090-8765-4321",
    email: "michael.t@email.com",
    businessType: "work-visa",
    businessTypeLabel: "技人国",
    source: "web",
    sourceLabel: "网站表单",
    referrer: "",
    status: "new",
    ownerId: "suzuki",
    groupId: "tokyo-1",
    nextAction: "电话确认意向与签证类别",
    nextFollowUp: "2026-04-10",
    nextFollowUpLabel: "04-10",
    updatedAt: "2026-04-08",
    updatedAtLabel: "今天 15:30",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: null,
  },
  {
    id: "LEAD-2026-0035",
    name: "李华",
    phone: "080-2222-3333",
    email: "li.hua@email.com",
    businessType: "family-stay",
    businessTypeLabel: "家族滞在",
    source: "referral",
    sourceLabel: "介绍",
    referrer: "佐藤弁護士",
    status: "following",
    ownerId: "tanaka",
    groupId: "tokyo-1",
    nextAction: "邮件发送材料清单，确认扶养者信息",
    nextFollowUp: "2026-04-12",
    nextFollowUpLabel: "04-12",
    updatedAt: "2026-04-07",
    updatedAtLabel: "昨天 11:20",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: null,
  },
  {
    id: "LEAD-2026-0028",
    name: "田中 太郎",
    phone: "070-5555-6666",
    email: "tanaka.t@email.com",
    businessType: "business-manager",
    businessTypeLabel: "设立法人",
    source: "walkin",
    sourceLabel: "来访",
    referrer: "",
    status: "pending_sign",
    ownerId: "sato",
    groupId: "osaka",
    nextAction: "面谈确认签约条件与费用",
    nextFollowUp: "2026-04-11",
    nextFollowUpLabel: "04-11",
    updatedAt: "2026-04-06",
    updatedAtLabel: "04-06 17:00",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: null,
  },
  {
    id: "LEAD-2026-0015",
    name: "王 明",
    phone: "080-7777-8888",
    email: "wang.ming@email.com",
    businessType: "work-visa",
    businessTypeLabel: "技人国",
    source: "referral",
    sourceLabel: "介绍",
    referrer: "山田商事",
    status: "converted_case",
    ownerId: "suzuki",
    groupId: "tokyo-2",
    nextAction: "",
    nextFollowUp: "",
    nextFollowUpLabel: "—",
    updatedAt: "2026-04-02",
    updatedAtLabel: "04-02",
    convertedCustomerId: "CUS-2026-0195",
    convertedCaseId: "CAS-2026-0210",
    dedupHint: null,
    rowHighlight: null,
  },
  {
    id: "LEAD-2026-0019",
    name: "佐藤 美咲",
    phone: "090-4444-1111",
    email: "sato.misaki@email.com",
    businessType: "permanent",
    businessTypeLabel: "永住",
    source: "phone",
    sourceLabel: "电话",
    referrer: "",
    status: "lost",
    ownerId: "tanaka",
    groupId: "tokyo-1",
    nextAction: "",
    nextFollowUp: "",
    nextFollowUpLabel: "—",
    updatedAt: "2026-03-28",
    updatedAtLabel: "03-28",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: "dimmed",
  },
  {
    id: "LEAD-2026-0022",
    name: "陈 大伟",
    phone: "080-9999-0000",
    email: "chen.dw@email.com",
    businessType: "family-stay",
    businessTypeLabel: "家族滞在",
    source: "web",
    sourceLabel: "网站表单",
    referrer: "",
    status: "signed",
    ownerId: "suzuki",
    groupId: "tokyo-1",
    nextAction: "请尽快建立客户档案并创建案件",
    nextFollowUp: "2026-04-09",
    nextFollowUpLabel: "04-09",
    updatedAt: "2026-04-05",
    updatedAtLabel: "04-05",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: "warning",
    warningText: "已签约，待建档：请完成客户建档和案件创建",
  },
  {
    id: "LEAD-2026-0046",
    name: "田中 花子",
    phone: "080-1234-5678",
    email: "",
    businessType: "highly-skilled",
    businessTypeLabel: "高度人才",
    source: "phone",
    sourceLabel: "电话",
    referrer: "",
    status: "new",
    ownerId: "sato",
    groupId: "osaka",
    nextAction: "确认重复后联系本人",
    nextFollowUp: "2026-04-14",
    nextFollowUpLabel: "04-14",
    updatedAt: "2026-04-09",
    updatedAtLabel: "今天 09:15",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: "phoneMatchLead",
    rowHighlight: null,
  },
  {
    id: "LEAD-2026-0047",
    name: "李娜（重复确认）",
    phone: "",
    email: "li.na@email.com",
    businessType: "family-stay",
    businessTypeLabel: "家族滞在",
    source: "web",
    sourceLabel: "网站表单",
    referrer: "",
    status: "new",
    ownerId: "tanaka",
    groupId: "tokyo-1",
    nextAction: "与既有客户合并确认",
    nextFollowUp: "2026-04-13",
    nextFollowUpLabel: "04-13",
    updatedAt: "2026-04-09",
    updatedAtLabel: "今天 10:00",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: "emailMatchCustomer",
    rowHighlight: null,
  },
];

const LEAD_NEXT_ACTIONS: Partial<Record<string, Record<AppLocale, string>>> = {
  "LEAD-2026-0042": {
    "zh-CN": "电话确认意向与签证类别",
    "en-US": "Call to confirm intent and visa category",
    "ja-JP": "電話で意向と在留資格を確認",
  },
  "LEAD-2026-0035": {
    "zh-CN": "邮件发送材料清单，确认扶养者信息",
    "en-US": "Email the document checklist and confirm dependent details",
    "ja-JP": "メールで資料一覧を送り、扶養者情報を確認",
  },
  "LEAD-2026-0028": {
    "zh-CN": "面谈确认签约条件与费用",
    "en-US": "Confirm signing terms and fees in the meeting",
    "ja-JP": "面談で契約条件と費用を確認",
  },
  "LEAD-2026-0022": {
    "zh-CN": "请尽快建立客户档案并创建案件",
    "en-US": "Create the customer record and case as soon as possible",
    "ja-JP": "できるだけ早く顧客登録と案件作成を進める",
  },
  "LEAD-2026-0046": {
    "zh-CN": "确认重复后联系本人",
    "en-US": "Confirm the duplicate first, then contact the lead",
    "ja-JP": "重複確認後に本人へ連絡",
  },
  "LEAD-2026-0047": {
    "zh-CN": "与既有客户合并确认",
    "en-US": "Verify whether to merge with the existing customer",
    "ja-JP": "既存顧客への統合可否を確認",
  },
};

const LEAD_UPDATED_AT_LABELS: Partial<
  Record<string, Record<AppLocale, string>>
> = {
  "LEAD-2026-0042": {
    "zh-CN": "今天 15:30",
    "en-US": "Today 15:30",
    "ja-JP": "今日 15:30",
  },
  "LEAD-2026-0035": {
    "zh-CN": "昨天 11:20",
    "en-US": "Yesterday 11:20",
    "ja-JP": "昨日 11:20",
  },
  "LEAD-2026-0046": {
    "zh-CN": "今天 09:15",
    "en-US": "Today 09:15",
    "ja-JP": "今日 09:15",
  },
  "LEAD-2026-0047": {
    "zh-CN": "今天 10:00",
    "en-US": "Today 10:00",
    "ja-JP": "今日 10:00",
  },
};

function resolveLocalizedLeadField(
  localizedMap: Partial<Record<string, Record<AppLocale, string>>>,
  leadId: string,
  locale: AppLocale,
  fallback: string,
): string {
  return localizedMap[leadId]?.[locale] ?? fallback;
}

/**
 * 按当前语言返回线索列表 mock 数据，避免 fallback 文案固定为单一语言。
 *
 * @param locale 当前应用语言
 * @returns 对应语言的线索列表样例
 */
export function getLeadSamples(
  locale: AppLocale = getCurrentLocale(),
): LeadSummary[] {
  return LEAD_SAMPLES_BASE.map((lead) => ({
    ...lead,
    nextAction: resolveLocalizedLeadField(
      LEAD_NEXT_ACTIONS,
      lead.id,
      locale,
      lead.nextAction,
    ),
    updatedAtLabel: resolveLocalizedLeadField(
      LEAD_UPDATED_AT_LABELS,
      lead.id,
      locale,
      lead.updatedAtLabel,
    ),
  }));
}

export const LEAD_SAMPLES: LeadSummary[] = getLeadSamples();

export { LEAD_DETAIL_SAMPLES } from "./fixtures-detail";

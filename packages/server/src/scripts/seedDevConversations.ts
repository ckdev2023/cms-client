/**
 * H-10（R-CONSULT-02 follow-up）：admin 端没有创建会话的 UI 入口
 *
 * 设计上 conversation 由 AppUser 端发起（portal/conversations.controller
 * 有 `@Post()`，但需要 `AppUserAuthGuard`），admin 端
 * `conversations.admin.controller.ts` 仅 GET / PATCH。本模块为 dev/walkthrough
 * 提供「已分配 owner」+「未分配 owner」+「含 failed translation」的 demo
 * 会话集，供 admin 端 e2e 验证：
 *
 * - send message
 * - assign owner（dialog）
 * - close / reopen
 * - retry-translation
 *
 * 实施细节与门禁约束：
 * - 走 `npm run db:seed-dev`（不进入 `localAdminBootstrap`，不影响生产路径）
 * - 全部 INSERT 用 `ON CONFLICT (id) DO NOTHING` 保证幂等
 * - UUID 命名空间使用 `b000`，与 `seedDevData.ts` 既有 `a000` 隔离
 * - 借助 cms_test/cms 超级用户 BYPASSRLS 绕过 conversations / messages 的
 *   FORCE RLS（与 `seedDevData.ts` 中其他 RLS 表保持同源）
 */
import type { PoolClient } from "pg";

const SEED_ORG_ID = "00000000-0000-4000-8000-000000000010";
const SEED_USER_ID = "00000000-0000-4000-8000-000000000011";

const SEED_APP_USER_ID = "00000000-0000-4000-b000-000000000001";
const SEED_LEAD_PORTAL_ID = "00000000-0000-4000-b000-000000000010";
const SEED_CONV_ASSIGNED_ID = "00000000-0000-4000-b000-000000000020";
const SEED_CONV_UNASSIGNED_ID = "00000000-0000-4000-b000-000000000021";
const SEED_MSG_ASSIGNED_USER_FIRST_ID = "00000000-0000-4000-b000-000000000030";
const SEED_MSG_ASSIGNED_STAFF_REPLY_ID = "00000000-0000-4000-b000-000000000031";
const SEED_MSG_ASSIGNED_USER_FAILED_ID = "00000000-0000-4000-b000-000000000032";
const SEED_MSG_UNASSIGNED_USER_ID = "00000000-0000-4000-b000-000000000033";

const APP_USER_NAME = "デモ依頼者 — 王 小明";
const APP_USER_PHONE = "+81 90-1234-5678";
const APP_USER_EMAIL = "demo-app-user@local.test";

const MESSAGE_INSERT_SQL = `INSERT INTO messages (
       id, conversation_id, org_id, sender_type, sender_id,
       original_language, original_text,
       translated_text_ja, translated_text_zh, translated_text_en,
       translation_status, kind, visible_scope
     )
     VALUES ($1, $2, $3, $4, $5,
             $6, $7,
             $8, $9, $10,
             $11, 'text', 'client_visible')
     ON CONFLICT (id) DO NOTHING`;

type MessageSeed = {
  id: string;
  conversationId: string;
  senderType: "app_user" | "staff";
  senderId: string;
  originalLanguage: "zh" | "ja" | "en";
  originalText: string;
  translatedJa: string | null;
  translatedZh: string | null;
  translatedEn: string | null;
  translationStatus: "completed" | "failed";
};

async function insertMessage(
  client: PoolClient,
  m: MessageSeed,
): Promise<void> {
  await client.query(MESSAGE_INSERT_SQL, [
    m.id,
    m.conversationId,
    SEED_ORG_ID,
    m.senderType,
    m.senderId,
    m.originalLanguage,
    m.originalText,
    m.translatedJa,
    m.translatedZh,
    m.translatedEn,
    m.translationStatus,
  ]);
}

/**
 * 插入一条 portal 端 demo AppUser，作为后续 lead/conversation 的发起方。
 *
 * @param client PostgreSQL 客户端（事务内）
 */
export async function seedConversationAppUser(
  client: PoolClient,
): Promise<void> {
  await client.query(
    `INSERT INTO app_users (id, name, email, phone, preferred_language, status)
     VALUES ($1, $2, $3, $4, 'zh', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [SEED_APP_USER_ID, APP_USER_NAME, APP_USER_EMAIL, APP_USER_PHONE],
  );
}

/**
 * 插入一条 portal 端 demo lead，关联 demo AppUser 与本地组织/管理员。
 *
 * 状态固定为 `following`，与 conversation 默认 `open` 对齐，便于走查时
 * 在 lead 详情 Tab3 看到关联会话。
 *
 * @param client PostgreSQL 客户端（事务内）
 */
export async function seedConversationLead(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO leads (
       id, org_id, app_user_id, source, language, status,
       assigned_org_id, owner_user_id, lead_no, name, phone, email,
       source_channel, intended_case_type, tags
     )
     VALUES ($1, $2, $3, 'web', 'zh', 'following',
             $2, $4, $5, $6, $7, $8,
             'web', 'family_stay', $9::text[])
     ON CONFLICT (id) DO NOTHING`,
    [
      SEED_LEAD_PORTAL_ID,
      SEED_ORG_ID,
      SEED_APP_USER_ID,
      SEED_USER_ID,
      "LEAD-DEV-PORTAL-001",
      APP_USER_NAME,
      APP_USER_PHONE,
      APP_USER_EMAIL,
      ["VIP", "優先", "面談済"],
    ],
  );
}

/**
 * 插入两条 demo conversation：
 *
 * - `SEED_CONV_ASSIGNED_ID`：已分配 owner = Local Admin，覆盖 send / close /
 *   reopen / retry-translation 路径
 * - `SEED_CONV_UNASSIGNED_ID`：未分配 owner，未读 1 条，覆盖 assign-dialog
 *   路径以及「我的会话/全部会话」筛选区分
 *
 * @param client PostgreSQL 客户端（事务内）
 */
export async function seedConversations(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO conversations (
       id, lead_id, app_user_id, org_id,
       channel, preferred_language, status,
       owner_user_id, last_message_at,
       unread_count_staff_tenant, unread_count_staff_owner, unread_count_user
     )
     VALUES ($1, $2, $3, $4, 'web', 'zh', 'open',
             $5, now(), 0, 0, 0)
     ON CONFLICT (id) DO NOTHING`,
    [
      SEED_CONV_ASSIGNED_ID,
      SEED_LEAD_PORTAL_ID,
      SEED_APP_USER_ID,
      SEED_ORG_ID,
      SEED_USER_ID,
    ],
  );

  await client.query(
    `INSERT INTO conversations (
       id, lead_id, app_user_id, org_id,
       channel, preferred_language, status,
       owner_user_id, last_message_at,
       unread_count_staff_tenant, unread_count_staff_owner, unread_count_user
     )
     VALUES ($1, $2, $3, $4, 'web', 'zh', 'open',
             null, now(), 1, 0, 0)
     ON CONFLICT (id) DO NOTHING`,
    [
      SEED_CONV_UNASSIGNED_ID,
      SEED_LEAD_PORTAL_ID,
      SEED_APP_USER_ID,
      SEED_ORG_ID,
    ],
  );
}

/**
 * 插入 4 条 demo message：
 *
 * - 已分配会话：1 条 user(zh→completed) + 1 条 staff(ja→completed) +
 *   1 条 user(zh→failed)，最后一条用于 admin 端 retry-translation 走查
 * - 未分配会话：1 条 user(zh→completed)，使会话列表非空
 *
 * @param client PostgreSQL 客户端（事务内）
 */
export async function seedConversationMessages(
  client: PoolClient,
): Promise<void> {
  for (const m of buildConversationMessageSeeds()) {
    await insertMessage(client, m);
  }
}

function buildConversationMessageSeeds(): MessageSeed[] {
  return [
    {
      id: SEED_MSG_ASSIGNED_USER_FIRST_ID,
      conversationId: SEED_CONV_ASSIGNED_ID,
      senderType: "app_user",
      senderId: SEED_APP_USER_ID,
      originalLanguage: "zh",
      originalText: "你好，我想咨询家族滞在签证的申请流程。",
      translatedJa:
        "こんにちは、家族滞在ビザの申請手続きについて相談したいです。",
      translatedZh: "你好，我想咨询家族滞在签证的申请流程。",
      translatedEn:
        "Hello, I would like to consult about the family stay visa application process.",
      translationStatus: "completed",
    },
    {
      id: SEED_MSG_ASSIGNED_STAFF_REPLY_ID,
      conversationId: SEED_CONV_ASSIGNED_ID,
      senderType: "staff",
      senderId: SEED_USER_ID,
      originalLanguage: "ja",
      originalText:
        "ご相談ありがとうございます。家族滞在ビザの取得には、配偶者ビザ等の在留資格保有者が必要です。",
      translatedJa:
        "ご相談ありがとうございます。家族滞在ビザの取得には、配偶者ビザ等の在留資格保有者が必要です。",
      translatedZh:
        "感谢您的咨询。要获得家族滞在签证，需要有持有配偶者签证等在留资格的家族成员。",
      translatedEn:
        "Thank you for your inquiry. To obtain a family stay visa, you need a family member who holds a residence status such as a spouse visa.",
      translationStatus: "completed",
    },
    {
      id: SEED_MSG_ASSIGNED_USER_FAILED_ID,
      conversationId: SEED_CONV_ASSIGNED_ID,
      senderType: "app_user",
      senderId: SEED_APP_USER_ID,
      originalLanguage: "zh",
      originalText: "我配偶持有「永住者」在留资格，请问需要准备哪些材料？",
      translatedJa: null,
      translatedZh: "我配偶持有「永住者」在留资格，请问需要准备哪些材料？",
      translatedEn: null,
      translationStatus: "failed",
    },
    {
      id: SEED_MSG_UNASSIGNED_USER_ID,
      conversationId: SEED_CONV_UNASSIGNED_ID,
      senderType: "app_user",
      senderId: SEED_APP_USER_ID,
      originalLanguage: "zh",
      originalText: "请问技术·人文知识·国际业务签证可以咨询吗？",
      translatedJa: "技術・人文知識・国際業務ビザについて相談できますか？",
      translatedZh: "请问技术·人文知识·国际业务签证可以咨询吗？",
      translatedEn:
        "Can I consult about the Engineer / Specialist in Humanities / International Services visa?",
      translationStatus: "completed",
    },
  ];
}

export {
  SEED_APP_USER_ID,
  SEED_LEAD_PORTAL_ID,
  SEED_CONV_ASSIGNED_ID,
  SEED_CONV_UNASSIGNED_ID,
  SEED_MSG_ASSIGNED_USER_FIRST_ID,
  SEED_MSG_ASSIGNED_STAFF_REPLY_ID,
  SEED_MSG_ASSIGNED_USER_FAILED_ID,
  SEED_MSG_UNASSIGNED_USER_ID,
};

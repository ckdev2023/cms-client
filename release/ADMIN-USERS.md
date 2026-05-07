# Admin 用户运维手册（生产）

> 适用范围：**后台管理员账号**（`users` 表，账号密码登录）。
> 不涉及 H5 / portal 的 `app_users`（无密码、走验证码）。
>
> 风险提醒：
> - 涉及到密码 hash、直接改 PG 表，**只允许有备份的运维**操作。
> - 所有命令都建议在 `tmux` / `screen` 里跑，避免断连后状态不一致。
> - **不要**把 `ADMIN_INIT_PASSWORD` / 临时密码长久写进 `.env`；用一次就清。

---

## 0. 通用前置

所有命令都假设：

```bash
cd /opt/cms-client/release       # 部署目录
COMPOSE="docker compose -f compose/docker-compose.prod.yml --env-file .env"
```

服务名（`docker-compose.prod.yml`）：`postgres / redis / api / worker / web`。

进 PG 交互式 shell（接下来很多命令都基于它）：

```bash
$COMPOSE exec postgres psql -U cms -d cms
```

> 单条 SQL 也可以直接 `$COMPOSE exec postgres psql -U cms -d cms -c "<SQL>"`。

---

## 1. 查询用户

### 1.1 按邮箱查（最常用）

```bash
$COMPOSE exec postgres psql -U cms -d cms -c "
  select u.id, u.org_id, u.name, u.email, r.code as role, u.status,
         (u.password_hash is null)            as hash_is_null,
         split_part(u.password_hash, '\$', 1)  as hash_algo,
         length(u.password_hash)              as hash_len,
         u.created_at, u.updated_at
    from users u
    join roles r on r.id = u.role_id
   where lower(u.email) = lower('admin@example.com');
"
```

判读字段：

| 字段 | 期望值 / 含义 |
|---|---|
| `status` | `active` 才能登录 |
| `role` | 通过 `role_id` 关联到 `roles.code`；值为 `owner` / `manager` / `staff` / `viewer` |
| `hash_is_null` | `f`（true 表示没设密码，必登录失败） |
| `hash_algo` | `scrypt`（其他值会被认证拒绝） |
| `hash_len` | 正常约 100~110 字符；偏离很可能 hash 损坏 |

### 1.2 列出某个 org 的全部管理员

```bash
$COMPOSE exec postgres psql -U cms -d cms -c "
  select u.id, u.email, u.name, r.code as role, u.status,
         o.name as org_name,
         array_agg(g.name) filter (where g.id is not null) as groups
    from users u
    join roles r on r.id = u.role_id
    join organizations o on o.id = u.org_id
    left join user_group_memberships m
      on m.user_id = u.id and m.active_flag = true
    left join groups g on g.id = m.group_id
   where u.org_id = '00000000-0000-4000-8000-000000000010'
   group by u.id, r.code, o.name
   order by r.code desc, u.email;
"
```

> 不知道 `org_id`？先 `select id, name from organizations;`。本地默认 org id 是 `00000000-0000-4000-8000-000000000010`，生产环境也可能沿用这个（取决于 bootstrap 时的 `ADMIN_INIT_ORG_ID`）。

### 1.3 同时核对登录通道（admin vs portal）

跨表确认一个邮箱在哪个通道存在：

```bash
$COMPOSE exec postgres psql -U cms -d cms -c "
  select 'users (admin)'   as src, u.id::text, u.email, r.code as role, u.status from users u join roles r on r.id = u.role_id where lower(u.email)=lower('xxx@example.com')
  union all
  select 'app_users (h5)'  as src, id::text, email, ''   as role, status from app_users  where lower(email)=lower('xxx@example.com');
"
```

> `customers` 表存的是客户档案，邮箱在 `base_profile->>'email'` / `contacts` 里，跟登录无关。

---

## 2. 修改密码

> 后端 `AuthService` 用 scrypt（`packages/server/src/modules/core/auth/auth.service.ts` L86–L111）。
> 存储格式：`scrypt$<salt-base64url>$<key-base64url>`。

### 2.1 推荐：用 `initLocalAdmin.ts` 脚本重置（覆盖式）

`bootstrapLocalAdmin` 在 `(org_id, email)` 冲突时会**直接覆盖 `password_hash`**，所以适合用来"重置已有账号的密码"。

```bash
ADMIN_INIT_EMAIL='admin@example.com' \
ADMIN_INIT_PASSWORD='YourStrongPassword!2026' \
$COMPOSE exec \
  -e ADMIN_INIT_EMAIL \
  -e ADMIN_INIT_PASSWORD \
  api node --import tsx src/scripts/initLocalAdmin.ts
```

成功输出：

```
[local-admin] ready
db: postgres://...
orgId: 00000000-0000-4000-8000-000000000010
email: admin@example.com
password: YourStrongPassword!2026
role: owner
```

注意事项：

1. `ADMIN_INIT_EMAIL` **必须等于数据库里现存账号的 email**，否则会插一条新行，原账号密码不变。
2. `ADMIN_INIT_ORG_ID` / `ADMIN_INIT_USER_ID` 默认走 local 默认值；如果你的生产 org_id 不一样，需要把 `ADMIN_INIT_ORG_ID=<现有 org_id>` 一起传进去。
3. 脚本会顺手保证：org / user / 默认 group / 默认 membership / storageRoot 都存在；对于已存在的账号，是 upsert，不会丢数据。
4. **登录后立刻去后台改密码**，把这个临时密码作废。
5. 如果想顺便改角色，可以加 `-e ADMIN_INIT_ROLE=manager`（合法值：`owner | manager | staff | viewer`）。

### 2.2 应急：在另一台机器算 hash → 直接 UPDATE

适用场景：API 容器跑不动 / 不想触发 bootstrap 的副作用 / 只想改一行密码。

**Step 1：在任何能跑 Node 的机器上算 hash**

```bash
node -e '
  const c = require("crypto");
  const password = process.argv[1];
  const salt = c.randomBytes(16).toString("base64url");
  c.scrypt(password, Buffer.from(salt, "base64url"), 64, (err, key) => {
    if (err) throw err;
    console.log("scrypt$" + salt + "$" + key.toString("base64url"));
  });
' 'YourStrongPassword!2026'
```

输出形如：`scrypt$abc...$def...`

> 该算法与 `auth.service.ts` 的 `hashPassword` 完全一致（scrypt + 16 字节 salt + 64 字节 key + base64url）。

**Step 2：在生产 PG 里直接更新**

```bash
$COMPOSE exec postgres psql -U cms -d cms -c "
  update users
     set password_hash = 'scrypt$abc...$def...',
         status        = 'active',
         updated_at    = now()
   where lower(email) = lower('admin@example.com')
  returning id, email, status;
"
```

返回 1 行即成功。立即可用新密码登录。

---

## 3. 创建新管理员用户

> 日常账号增删改首选 admin UI 或 `POST /users` / `PATCH /users/:id/role` 等 API（见 `UsersController`）；下面的 SQL 路径仅在 admin 全部不可用、需要应急救援时使用。
>
> 一个完整的"可用"管理员需要：
> 1. `users` 行（含 `password_hash`、`role_id`、`status='active'`）
> 2. `user_group_memberships` 行（必须挂到至少一个有效 `groups`，否则在涉及组隔离的查询里会看不到任何数据）

### 3.1 推荐：用 SQL 一次创建（在事务里）

适用：org 已经存在、要新建一个新管理员（不动现有数据）。

**Step 1：先确定要落到哪个 org 和 group**

```bash
$COMPOSE exec postgres psql -U cms -d cms -c "
  select o.id as org_id, o.name as org_name,
         g.id as group_id, g.name as group_name
    from organizations o
    join groups g on g.org_id = o.id and g.active_flag = true
   order by o.name, g.name;
"
```

挑出目标 `org_id` 和 `group_id`。

**Step 2：在另一台机器算密码 hash**

参考 §2.2 的 Step 1。

**Step 3：在事务里 INSERT**

```bash
$COMPOSE exec postgres psql -U cms -d cms <<'SQL'
BEGIN;

-- 3.1 新建用户行
WITH new_user AS (
  INSERT INTO users (org_id, name, email, password_hash, role_id, status)
  VALUES (
    '<ORG_ID>'::uuid,
    'Alice Manager',
    lower('alice@example.com'),
    'scrypt$abc...$def...',         -- §2.2 算出来的 hash
    (SELECT id FROM roles
      WHERE org_id = '<ORG_ID>'::uuid
        AND code = 'manager'
        AND is_system = true),       -- owner / manager / staff / viewer
    'active'
  )
  RETURNING id
)
-- 3.2 挂到默认 group（无 group 会触发组隔离把数据全过滤掉）
INSERT INTO user_group_memberships
  (user_id, group_id, is_primary_group, active_flag, joined_at)
SELECT new_user.id, '<GROUP_ID>'::uuid, true, true, now()
FROM new_user;

-- 验证
SELECT u.id, u.email, r.code AS role, u.status,
       g.name AS primary_group
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN user_group_memberships m
    ON m.user_id = u.id AND m.active_flag = true
  LEFT JOIN groups g ON g.id = m.group_id
 WHERE u.email = lower('alice@example.com');

COMMIT;
SQL
```

> 把 `<ORG_ID>` / `<GROUP_ID>` / hash 替换成实际值。角色 `code` 可选 `owner / manager / staff / viewer`。如果验证 SELECT 不对，跑 `ROLLBACK;` 而不是 `COMMIT;`。

约束提醒：

- `users (org_id, email)` 是 unique（`001_init.sql` L27）。同 org 同邮箱重复会报 `duplicate key`，按 §2.1 / §2.2 走"重置密码"路径而不是"创建"。
- `user_group_memberships (user_id, group_id) where active_flag = true` 也是 unique。
- 一个用户可以挂多个 group，但 `is_primary_group` 只能有一个 true。

### 3.2 进阶：同时新建一个新 org + owner 管理员

直接用 `initLocalAdmin.ts`，把所有变量都传一遍：

```bash
ADMIN_INIT_ORG_ID='00000000-0000-4000-8000-000000000020' \
ADMIN_INIT_ORG_NAME='Tokyo Office' \
ADMIN_INIT_USER_ID='00000000-0000-4000-8000-000000000021' \
ADMIN_INIT_USER_NAME='Tokyo Owner' \
ADMIN_INIT_EMAIL='owner@tokyo.example.com' \
ADMIN_INIT_PASSWORD='YourStrongPassword!2026' \
ADMIN_INIT_ROLE='owner' \
$COMPOSE exec \
  -e ADMIN_INIT_ORG_ID -e ADMIN_INIT_ORG_NAME \
  -e ADMIN_INIT_USER_ID -e ADMIN_INIT_USER_NAME \
  -e ADMIN_INIT_EMAIL -e ADMIN_INIT_PASSWORD -e ADMIN_INIT_ROLE \
  api node --import tsx src/scripts/initLocalAdmin.ts
```

会一次性创建：org / user / 默认 group（`Local Default Group`）/ membership / storageRoot。

> 多客户场景一定要把 `ADMIN_INIT_ORG_ID` 和 `ADMIN_INIT_USER_ID` 设成新的 UUID，否则会覆盖默认 local 的那一对（`...010 / ...011`）。

---

## 4. 停用 / 启用 / 改角色

### 4.1 停用

```sql
update users
   set status = 'disabled', updated_at = now()
 where lower(email) = lower('alice@example.com');
```

> 登录路径只接受 `status='active'`（`auth.service.ts` L99–L101），其他值都会 401。

### 4.2 重新启用

```sql
update users
   set status = 'active', updated_at = now()
 where lower(email) = lower('alice@example.com');
```

### 4.3 改角色

> 优先用 `PATCH /users/:id/role` API（`UsersController`）。以下 SQL 仅限应急。

```sql
update users
   set role_id = (
         select id from roles
          where org_id = users.org_id
            and code = 'manager'
            and is_system = true
       ),
       updated_at = now()
 where lower(email) = lower('alice@example.com');
```

合法 `code`：`owner | manager | staff | viewer`（`packages/server/src/modules/core/auth/roles.ts`）。

### 4.4 撤掉 group 成员关系（软删除）

```sql
update user_group_memberships
   set active_flag = false, left_at = now()
 where user_id = '<USER_ID>'::uuid
   and group_id = '<GROUP_ID>'::uuid
   and active_flag = true;
```

---

## 5. 故障排查 Checklist

登录失败时按这个顺序排查：

1. `select status from users where lower(email)=lower('xxx');` → 必须 `active`
2. `select r.code from users u join roles r on r.id = u.role_id where lower(u.email)=lower('xxx');` → 必须是 `owner/manager/staff/viewer` 之一
3. `select password_hash from users where lower(email)=lower('xxx');` → 不能为空，必须 `scrypt$...$...` 三段
4. 密码本身：让用户重输 / 直接走 §2.1 重置
5. 容器日志：`bash scripts/logs.sh api | grep -i 'auth\|login\|unauth'`

> 后端会把所有失败原因（密码错、status 非 active、role 解析失败、hash 缺失）统一返回 `Invalid email or password`，所以从前端报错文案分不出来——一定要看后端日志或直接查表。

---

## 6. 安全与残留清理

每次涉及密码的操作做完务必：

1. 清掉 shell history 里含明文密码的行：
   ```bash
   history -d $(history | awk '/ADMIN_INIT_PASSWORD/{print $1}' | tail -1)
   # 或粗暴一点：
   history -c && history -w
   ```
2. 确认 `.env` 里没有写入临时密码（`grep ADMIN_INIT_PASSWORD .env`）。
3. 通知账号本人**首次登录后立即在后台修改密码**。
4. 涉及多人协作时，用临时一次性密码渠道传递（例如自毁链接），避免明文走 IM。

---

## 附录：相关源码定位

| 用途 | 路径 |
|---|---|
| 登录校验 | `packages/server/src/modules/core/auth/auth.service.ts` |
| Bootstrap upsert SQL | `packages/server/src/modules/core/auth/localAdminBootstrap.ts` |
| Bootstrap CLI 入口 | `packages/server/src/scripts/initLocalAdmin.ts` |
| 角色枚举 | `packages/server/src/modules/core/auth/roles.ts` |
| `users` 表定义 | `packages/server/src/infra/db/migrations/001_init.sql` (L18–L28) |
| `users` 辅助列与 CHECK 约束 | `packages/server/src/infra/db/migrations/049_users_admin_columns.up.sql` |
| `roles` / `role_permissions` / `user_permission_overrides` 表定义 | `packages/server/src/infra/db/migrations/050_roles_permissions_tables.up.sql` |
| `users.role` 列移除、`role_id` NOT NULL | `packages/server/src/infra/db/migrations/051_deprecate_users_role_text.up.sql` |
| `groups` / `user_group_memberships` 表定义 | `packages/server/src/infra/db/migrations/022_groups_and_case_group.up.sql` |
| `users` CRUD API（admin UI 用） | `packages/server/src/modules/core/users/users.controller.ts` |

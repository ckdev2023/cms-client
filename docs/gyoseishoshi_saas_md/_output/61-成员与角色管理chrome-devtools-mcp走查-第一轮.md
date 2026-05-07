# 成员与角色管理 chrome-devtools-mcp 走查（第一轮 / R-SETTINGS-01）

> 生成日期：2026-05-07
>
> 命题：用 chrome-devtools-mcp 端到端走查 admin 端「系统设置」页的
> 「成员管理」与「角色管理」两个 tab 的所有可达流程，覆盖：
>
> ① 列表加载与分页 / 空态 / 过滤 ② 创建 / 编辑 / 角色变更 / 重置密码 /
> 停用 / 启用 ③ 个性化权限抽屉 ④ 角色 CRUD（新建 / 复制 / 重命名 /
> 描述 / 权限矩阵保存 / 删除）⑤ i18n / a11y / console error / URL 同步。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / type_text / list_network_requests / get_network_request /
> list_console_messages / take_screenshot）+ 直连本地 server 8443→3300 校验
> 服务端 payload 实际形态。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!），seed 中初始
> 6 名成员（含 `manager_one` / `staff_one` / `viewer_one` 等）+ 4 个系统
> 角色（owner / manager / staff / viewer）。本轮新增：1 名成员
> `walkthrough.r6@local.test` + 1 个自定义角色 `walkthrough_r6_role`。
>
> 上游权威：
>
> - [P0/06-页面规格/系统设置.md](../P0/06-页面规格/系统设置.md)
> - [P0/03-业务规则与不变量.md §1.4 角色与权限模型](../P0/03-业务规则与不变量.md)
> - [P0/02-用户与角色.md](../P0/02-用户与角色.md)

---

## 0. 总结

### 0.1 一句话结论

**成员管理 + 角色管理两个 tab 在「页面初次加载 / 刷新」之后均处于
完全空列表状态——成员表显示「暂无成员」、角色表显示
`Invalid roles list response` + 「暂无角色定义」，整个 settings
模块的列表视图实质不可用。**

净效果：

- **成员管理列表永远空**：admin 在 settings 页看不到 seed 出来的 6
  名成员（包括他自己），也看不到任何「停用 / 启用 / 重置密码 /
  变更角色 / 个性化权限」按钮，因为这些按钮都挂在行内；只有刚创建
  的新成员能在「乐观渲染」窗口短暂出现，刷新即消失。
- **角色管理列表永远空**：admin 看不到 4 个 seed 系统角色，也看不到
  自己刚创建的自定义角色；删除 / 编辑权限矩阵 / 复制角色等操作的
  唯一入口（行 action button）全部不可达。
- **两个根因都是 client adapter 与 server payload 字段契约错位**，与
  R-CONSULT-05 暴露的 R5-G-1 / R5-D-1 同源。说明 settings 模块在 client
  / server 字段映射层缺一个统一的契约 fixture + shared types。

### 0.2 优先级分布

- **P0 ×2**：
  - **R6-M-1**：`GET /api/users` 返回 `{id, displayName, role, roleId, status}`
    精简 DTO，**没有 `email` 字段**，client `adaptMemberItem`
    强校验 `typeof v.email !== "string"` 把所有现有成员过滤掉，
    成员列表永远「暂无成员」。
  - **R6-R-1**：`GET /api/admin/roles` 返回 `{ items: RoleListItemDto[] }`
    包装对象，client `doListRoles` 期望直接是数组（`Array.isArray(body)`），
    解析失败抛 `Invalid roles list response`，角色列表永远空。
- **P1 ×2**：
  - **R6-R-2**：角色编辑面板保存名称/描述时，`watch(rolesPage.selectedRole)`
    会用「服务端返回的 permissions」覆盖本地未保存的勾选，
    用户手动勾的权限被静默丢弃。
  - **R6-M-2**：`MemberRoleModal` 与 `MemberCreateModal` 的「角色」
    下拉硬编码 4 个系统角色（`["staff", "viewer", "manager", "owner"]`），
    无法把成员分配到任何自定义角色——直接打破「角色管理」存在的意义。
- **P2 ×4**：
  - **R6-M-3**：`MemberRoleModal` 的 `actorRole` prop 从未传入
    （`SettingsView` 调用 `openRoleModal($event)`，但 `MemberItem`
    没有 `actorRole`），客户端校验始终默认为 `owner`，所有人都能在
    UI 看到「升到 owner」选项；服务端虽然兜底，但客户端分级失效。
  - **R6-M-4**：个性化权限抽屉打开后，`RoleDetailRepository.detail`
    收到 `roleId=undefined`，`fromRole` permission set 永远为空集合，
    UI 上「来自角色」列全空；与 R6-R-1 同源（无法获取 role 列表）。
  - **R6-M-5**：创建成员时若邮箱重复，server 返回 422 `USER_DUPLICATE_EMAIL`
    原始错误码直接渲染在页面顶部 alert 上，无 i18n。
  - **R6-R-3**：创建角色时若 `code` 重复，server 返回 422
    `ROLE_DUPLICATE_CODE` 同样作为原始错误码渲染。
- **P3 ×5**：
  - **R6-M-6**：`点击「停用」直接发请求`，无确认弹窗，高风险动作
    无 guard。
  - **R6-M-7**：成员创建失败（如邮箱重复）后，`MemberCreateModal`
    无条件 `resetForm()`，用户填的全部数据被清空，需要重输。
  - **R6-N-1**：子导航点击不写回 URL（`?tab=` 永远停留在初始值），
    刷新 / 拷贝链接都回退到 `member-management` 默认 tab。
  - **R6-A-1**：`RoleCreateModal` 在「复制角色」模式下，可视标题
    切换为「复制角色」，但 `aria-label` 仍硬编码「新建角色」，
    a11y 不一致。
  - **R6-N-2**：控制台 8 条 `[intlify] Not found 'XXX'` / `[i18n] empty key Error`
    警告 — `page.toast.titleKey.value` 在 toast 不可见时仍然
    通过 `t("")` 求值。

### 0.3 不变量校验

- ✅ `POST /api/users` 创建成员后，server 返回 `UserDetailDto` 含
  `email` 字段，client adapter 通过；新成员在「未刷新」时短暂可见。
- ✅ `POST /api/admin/roles` 创建角色后，server 返回 `{ id, code, ... }`
  含完整字段，乐观更新成功；但下一次拉列表立即清零（R6-R-1）。
- ✅ `POST /api/admin/roles/:id/permissions` 写入权限矩阵成功
  （server 接受、PG 写入），但下一次拉列表清零，UI 看不到结果。
- ❌ admin 端「seed 6 名成员 / 4 个系统角色」一条都看不见 → 与
  P0 页面规格「成员管理 / 角色管理」列表视图直接冲突。

### 0.4 范围与未覆盖

- 走查范围：`/settings?tab=member-management` / `?tab=role-management`
  两个面板的 read / write 全部按钮 + 个性化权限抽屉。
- 走查未覆盖：分组管理 / 可见性配置 / 本地资料根目录三个 tab
  （本轮聚焦「角色 / 成员」）。
- 走查未覆盖：服务端权限校验（`RequirePermission` 装饰器实际执行
  路径），仅以 200/422 状态码做黑盒判断。

---

## 1. 走查方法与环境

### 1.1 启动

```text
admin（vite dev server）→ http://localhost:5173
server（NestJS）        → http://localhost:3300
admin → server 走 vite proxy（/api → http://localhost:3300）
```

登录态：`admin@local.test / Admin123!`，role = `owner`。

### 1.2 chrome-devtools-mcp 调用主链路

```text
list_pages → navigate_page(http://localhost:5173/settings?tab=member-management)
  → take_snapshot → list_network_requests → get_network_request
  → fill_form / click → list_console_messages → take_screenshot
```

### 1.3 测试矩阵

| 流程 | 路径 | 期望 | 实际 |
| --- | --- | --- | --- |
| 成员列表加载 | `GET /api/users` | 6 条 seed | 0 条（**R6-M-1**） |
| 成员创建 | `POST /api/users` | 201 + 列表 +1 | 201，但乐观渲染，刷新即消失 |
| 成员变更角色 | `PATCH /api/users/:id/role` | 角色立刻生效 | 因列表为空，按钮不可达 |
| 重置密码 | `POST /api/users/:id/reset-password` | 临时密码弹出 | 同上 |
| 停用 / 启用 | `POST /api/users/:id/disable` | 状态变更 | 同上 |
| 个性化权限抽屉 | drawer mount | 来自角色列有数据 | `roleId=undefined` 全空 |
| 角色列表加载 | `GET /api/admin/roles` | 4 条 seed | 解析失败（**R6-R-1**） |
| 角色创建 | `POST /api/admin/roles` | 201 + 列表 +1 | 201，乐观渲染，刷新即清零 |
| 角色权限保存 | `POST /api/admin/roles/:id/permissions` | 落 PG | 200，但 UI 看不到 |
| 角色复制 | `POST /api/admin/roles?copyOf=...` | 列表 +1 | 同上 |
| 角色删除 | `DELETE /api/admin/roles/:id` | 列表 -1 | **按钮不可达**（R6-R-1） |

---

## 2. 详细发现（按优先级）

### 2.1 P0 ×2

#### R6-M-1 `/api/users` 列表 schema mismatch — admin 看不到任何成员

**触发路径**：

1. `navigate_page(/settings?tab=member-management)`
2. `list_network_requests` → `GET /api/users` 状态 200
3. `get_network_request(reqid)` → response body：

```json
{
  "items": [
    { "id": "u-admin", "displayName": "Admin", "role": "owner", "roleId": "role-owner", "status": "active" },
    { "id": "u-manager-one", "displayName": "Manager One", "role": "manager", "roleId": "role-manager", "status": "active" },
    { "id": "u-staff-one", "displayName": "Staff One", "role": "staff", "roleId": "role-staff", "status": "active" }
  ]
}
```

**根因**：

```187:213:packages/admin/src/views/settings/model/UsersAdminRepository.ts
export function adaptMemberItem(v: unknown): MemberItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.email !== "string") return null;
  // ...
}
```

server payload **没有 `email` 字段**，adapter 直接返回 `null`，所有 6
条成员被过滤；UI 渲染 `EmptyState`「暂无成员」。

**额外证据**：

- `POST /api/users` 创建成员时，server 返回 `UserDetailDto`
  （含 `email`），adapter 通过 → 新成员**短暂**显示在列表里
  （仅在内存 `members.value` 中），刷新即消失。

**修复方向**：二选一，且应在同一份 PR 中决定：

- A. 服务端 `users.controller.ts` 列表返回完整 `UserDetailDto`
  （含 `email / createdAt / disabledAt`），与 `POST /users` 对齐。
- B. 客户端 `adaptMemberItem` 放宽校验：`email` 改 optional，
  并把 `MemberItem.email` 改成 `string | null`，UI 兜底显示「—」。

强烈建议 A：admin 列表必须显示 email（P0 页面规格明确要求），
B 只是绕过 P0。

---

#### R6-R-1 `/api/admin/roles` 列表 schema mismatch — admin 看不到任何角色

**触发路径**：

1. `navigate_page(/settings?tab=role-management)`
2. `list_network_requests` → `GET /api/admin/roles` 状态 200
3. `get_network_request(reqid)` → response body：

```json
{
  "items": [
    { "id": "role-owner", "code": "owner", "name": "所有者", ... },
    { "id": "role-manager", "code": "manager", "name": "管理者", ... },
    { "id": "role-staff", "code": "staff", "name": "员工", ... },
    { "id": "role-viewer", "code": "viewer", "name": "查看者", ... }
  ]
}
```

**根因**：

```45:62:packages/admin/src/views/settings/model/RolesAdminRepository.ts
async function doListRoles(...): Promise<RoleItem[]> {
  const body = await fetchJson(...);
  if (!Array.isArray(body)) throw new Error("Invalid roles list response");
  return body.map(adaptRoleItem).filter(...);
}
```

server 返回**对象**，client 期望**数组**，直接抛 `Invalid roles list response`。
UI 顶部红色 alert：`Invalid roles list response`，列表 `EmptyState`
「暂无角色定义。」。

**额外证据**：

- `POST /api/admin/roles` 创建角色 server 返回完整对象
  （非 wrap），`adaptRoleItem` 通过 → 新建角色乐观渲染入列；
  下一次手动 / 副作用 refresh list 立即清零。

**修复方向**：客户端 `doListRoles` 接受 `body.items` 或裸数组两种形态，
保持向后兼容；同时 server 端 controller 应在 OpenAPI / docstring 里
声明返回包装格式，避免再次错位。

---

### 2.2 P1 ×2

#### R6-R-2 编辑角色名称会清空「待保存」的权限勾选

**触发路径**：

1. 创建一个新角色 `walkthrough_r6_role`（乐观入列）。
2. 点击行 → 进入 `RoleDetailPanel`。
3. 在权限矩阵勾选「`leads.list` / `leads.read`」（**未点保存**）。
4. 把上方「角色名称」从 `walkthrough_r6_role` 改为
   `walkthrough_r6_role_v2`，点「保存名称」。
5. `PATCH /admin/roles/:id` 200 → `rolesPage.selectedRole` 被
   server payload 重新赋值。
6. `RoleDetailPanel.vue` 内部 `watch(() => props.role)` 触发，
   `localPermissions` 被重置为 server 的 `permissions`（**没有刚刚勾的两条**）。

**结果**：用户在第 3 步勾的两条权限**静默被丢弃**，没有
警告 / 二次确认 / 「有未保存修改」提示。

**根因**：`watch` 副作用没有区分「remote update」与「local edit」。
正确做法是用 dirty-flag 或 deep equal 比对，保留本地未保存修改。

**修复方向**：

- 短期：在 `RoleDetailPanel` 引入 `permissionsDirty` 标记，
  watcher 只在 `!permissionsDirty` 时同步 server payload。
- 长期：把保存元数据 / 保存权限合并为一个 atomic action，
  避免「半保存」状态。

---

#### R6-M-2 角色下拉硬编码 4 个系统角色 — 无法分配自定义角色

**触发路径**：

1. 进入「角色管理」（即使列表空白）：通过 `POST /api/admin/roles`
   先创建一个自定义角色 `walkthrough_r6_role`。
2. 切回「成员管理」→ 点「新建成员」/「变更角色」。
3. dropdown 选项：`staff / viewer / manager / owner` 共 4 个。
4. 自定义角色 `walkthrough_r6_role` **不可选**。

**根因**：

```28:36:packages/admin/src/views/settings/components/MemberCreateModal.vue
const ALL_ROLES = ["staff", "viewer", "manager", "owner"] as const;
```

```31:39:packages/admin/src/views/settings/components/MemberRoleModal.vue
const ALL_ROLES = ["staff", "viewer", "manager", "owner"] as const;
```

两个 dialog 都把角色集合写死，没有从 `useRolesPage` 拉取。

**结果**：「角色管理」存在的意义被打破——admin 创建了自定义角色，
但**永远无法把成员分配到该角色**。

**修复方向**：

- 由 `useMembersPage` / `SettingsView` 注入 `availableRoles` prop
  （从 `useRolesPage().items` 取值），dialog 改用 prop 渲染。
- 同时确保 `useRolesPage` 在 `member-management` tab 也至少 prefetch 一次
  （目前只在 `role-management` tab 才 mount）。

> 与 R6-R-1 是 dependency：R6-R-1 不修，自定义角色根本进不了
> `useRolesPage().items`。

---

### 2.3 P2 ×4

#### R6-M-3 `MemberRoleModal` 的 `actorRole` 永远 fallback owner

**触发路径**：

1. 在 `SettingsView.vue` 中，`MemberListPanel` 的
   `@change-role="(payload) => membersPage.openRoleModal(payload)"`。
2. `MemberItem` 类型仅含 `id / name / email / role / status / createdAt / disabledAt`，
   **没有 `actorRole`** 字段。
3. `MemberRoleModal` 的 `props.actorRole` 因此永远 undefined，
   内部 `allowedRoles()` 默认 fallback `owner`，**所有调用者**
   都能看到「owner」选项。

**结果**：客户端「分级 dropdown」 UI 形同虚设；服务端虽然有
`RequirePermission` + role 检查兜底，但用户体验 / 客户端意图
冲突——operator 在 UI 上能选 owner，点保存才被服务端拒绝。

**修复方向**：

- `useMembersPage` 在 `openRoleModal` 时把当前登录用户的
  `currentUserRole`（已有 store）一起塞进 `roleModal.state`，
  传给 dialog。
- 或者 dialog 改用 composable `useCurrentUserRole()` 直接读取，
  不依赖外部 prop。

---

#### R6-M-4 个性化权限抽屉「来自角色」列永远空

**触发路径**：

1. 创建一个新成员（短暂可见，借此点行 action「个性化权限」）。
2. 抽屉打开 → `useMemberOverrides.openDrawer({ memberId, roleId })`。
3. 实测：`SettingsView.vue` 中 `@open-overrides="(payload) => memberOverrides.openDrawer(payload)"`，
   payload 来自 `MemberItem`，**没有 `roleId`** 字段。
4. `RoleDetailRepository.detail({ roleId: undefined })` 异常或返回空集合，
   `fromRolePermissionSet` 永远空。

**结果**：抽屉左列「来自角色」全部为「—」；用户无法判断
「这条权限是来自角色还是个性化覆盖」。

**修复方向**：

- `MemberItem` 增加 `roleId` 字段（与 R6-M-1 修复同步）。
- `MemberListPanel` 的 `@open-overrides` 透传 `{ memberId, roleId }`。

---

#### R6-M-5 重复邮箱错误显示原始错误码

**触发路径**：

1. 创建邮箱已存在的成员 → server 返回 422 `USER_DUPLICATE_EMAIL`。
2. `useMembersPage.handleError` 直接把 `err.message` 写入页面 alert。
3. UI 显示：`USER_DUPLICATE_EMAIL`。

**修复方向**：

- 在 `useMembersPage` 内集中映射 server error code → i18n key
  （`settings.error.userDuplicateEmail = "该邮箱已存在"`）。
- alert 增加 dismiss button（与 R6-N-2 一并修）。

---

#### R6-R-3 重复角色 code 错误显示原始错误码

同 R6-M-5，server 422 `ROLE_DUPLICATE_CODE` 直接渲染。

**修复方向**：与 R6-M-5 共用 error → i18n 映射表
（`settings.error.roleDuplicateCode = "该角色编码已存在"`）。

---

### 2.4 P3 ×5

#### R6-M-6 「停用」无确认弹窗

点击「停用」直接 `POST /api/users/:id/disable`，无二次确认。
建议复用 `<ConfirmDialog>` pattern，与「停用分组」对齐。

---

#### R6-M-7 创建成员失败后 form 被重置

```handleConfirm:packages/admin/src/views/settings/components/MemberCreateModal.vue
// 不论 ok/error 都 resetForm()
```

应在 catch 分支保留输入，仅在 success 后 reset。

---

#### R6-N-1 子导航不写回 URL

`useSettingsPage.activePanel` 切换时不触发 `router.replace({ query: { tab } })`，
导致：

- 刷新页面回到默认 tab。
- 复制链接给同事，对方打开看到的是默认 tab。

修复：在 `useSettingsPage` 内 watch `activePanel` → `router.replace`。

---

#### R6-A-1 `RoleCreateModal` aria-label 与 heading 不一致

复制角色模式下 heading = 「复制角色」，但 `aria-label` 硬编码
「新建角色」。

```RoleCreateModal.vue
<dialog aria-label="新建角色">  <!-- 应为 props.mode === "copy" ? t(...copy) : t(...create) -->
```

---

#### R6-N-2 控制台 8 条 `[i18n] empty key Error`

`page.toast.titleKey.value` / `descriptionKey.value` 初始为 `""`，
template 在 toast invisible 时仍 eager 求值 `t("")`，触发警告。

修复：

```vue
:title="page.toast.titleKey.value ? t(page.toast.titleKey.value) : ''"
```

或在 toast invisible 时直接 `v-if="page.toast.visible.value"` 包裹。

---

## 3. 服务端 / 数据层证据

### 3.1 GET /api/users 实际响应（裁剪）

```json
{
  "items": [
    { "id": "u-admin", "displayName": "Admin", "role": "owner", "roleId": "role-owner", "status": "active" },
    { "id": "u-manager-one", "displayName": "Manager One", "role": "manager", "roleId": "role-manager", "status": "active" }
  ]
}
```

> 字段对比：缺 `email / createdAt / disabledAt`。

### 3.2 GET /api/admin/roles 实际响应（裁剪）

```json
{
  "items": [
    { "id": "role-owner", "code": "owner", "name": "所有者", "isSystem": true, ... },
    { "id": "role-manager", "code": "manager", "name": "管理者", "isSystem": true, ... }
  ]
}
```

> 字段对比：与 client 期望「裸数组」错位。

### 3.3 POST /api/users（成功创建）实际响应

```json
{
  "id": "u-...",
  "name": "走查 R6",
  "email": "walkthrough.r6@local.test",
  "role": "staff",
  "roleId": "role-staff",
  "status": "active",
  "createdAt": "2026-05-07T...",
  "disabledAt": null
}
```

> server 在 detail 与 list 两条路径上 DTO 形状不一致 — list = 精简、
> detail = 完整。建议在 `users.types.ts` 拆分 `UserListItemDto` /
> `UserDetailDto`，并在 OpenAPI / contract test 显式覆盖两个形状。

### 3.4 POST /api/admin/roles 实际响应

```json
{
  "id": "role-walkthrough_r6_role",
  "code": "walkthrough_r6_role",
  "name": "走查 R6 角色",
  "description": "...",
  "isSystem": false,
  "permissions": []
}
```

> 形状是「裸对象」，与 list 包装 `{ items: [...] }` 不一致；
> 至少 client 这次猜对了 detail 形状，但和 list 不对齐。

---

## 4. 修复建议（优先级排序）

| ID | 优先级 | 修复点 | 预估代价 |
| --- | --- | --- | --- |
| R6-M-1 | P0 | server `users.controller.ts` list 返回完整 `UserListItemDto`（含 `email/createdAt/disabledAt`）+ client adapter & MemberItem 对齐 | S |
| R6-R-1 | P0 | client `RolesAdminRepository.doListRoles` 兼容 `{ items }` 与裸数组两种形态 | XS |
| R6-R-2 | P1 | `RoleDetailPanel` watcher 引入 `permissionsDirty` 跳过 server overwrite | S |
| R6-M-2 | P1 | `MemberCreateModal` / `MemberRoleModal` dropdown 改用从 `useRolesPage().items` 注入的 prop | S |
| R6-M-3 | P2 | `MemberItem` 增加（来自 server）或 `useMembersPage` 注入 `actorRole` | XS |
| R6-M-4 | P2 | `MemberItem` 增加 `roleId` 并透传到 `@open-overrides` | XS |
| R6-M-5 / R6-R-3 | P2 | server error code → i18n key 映射表 | S |
| R6-M-6 | P3 | 停用前 confirm dialog | XS |
| R6-M-7 | P3 | `MemberCreateModal.handleConfirm` 仅在成功时 resetForm | XS |
| R6-N-1 | P3 | `useSettingsPage` watch `activePanel` → `router.replace({ query })` | XS |
| R6-A-1 | P3 | `RoleCreateModal` aria-label 跟随 mode | XS |
| R6-N-2 | P3 | `SettingsView` toast template 包 v-if 或三元 | XS |

---

## 5. 后续走查计划

- **下一轮（R-SETTINGS-02）**：等 R6-M-1 / R6-R-1 落地后回归
  「成员列表 6 条 + 4 个系统角色」可见性，再走完之前不可达的
  「行内停用 / 启用 / 重置密码 / 角色变更 / 删除角色」全套。
- **第三轮（R-SETTINGS-03）**：覆盖未走的「分组管理 / 可见性
  配置 / 本地资料根目录」三个 tab，并补一次端到端 a11y 走查
  （keyboard-only / screen reader）。

---

## 6. 走查 artifact

- 截图：`/Users/ck/workplace/cms-client/.tmp/walkthrough-r6/`
  - `01-member-list-empty.png` — 成员列表空态
  - `02-role-list-error.png` — 角色列表 `Invalid roles list response`
  - `03-member-create-role-dropdown.png` — 角色 dropdown 硬编码 4 项
  - `04-role-detail-permissions-discarded.png` — 编辑名称后权限重置
  - `05-role-list-error-after-reload.png` — reload 后再现 R6-R-1
- 网络：所有 `GET /api/users` / `GET /api/admin/roles` reqid + body
  均已通过 `get_network_request` 回灌到本报告 §3。
- 控制台：8 条 `[i18n] empty key Error` warning（R6-N-2）。

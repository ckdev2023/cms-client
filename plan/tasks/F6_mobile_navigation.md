# F6: Mobile Navigation 配置

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | F6 |
| Phase | F — Mobile 端业务 Feature |
| 前置依赖 | F1 (Auth)、F2-F5 (各 Feature Screen) |
| 后续解锁 | 无（Phase F 收尾） |
| 预估工时 | 0.5 天 |

## 目标

配置完整的 Mobile 导航结构：Auth Stack + Main Tab Navigator。

## 范围

### 需要修改的文件

- `packages/mobile/src/app/navigation/` — 主导航配置
- `packages/mobile/src/app/App.tsx` — 根组件

### 不可修改的目录

- `packages/server/`

## 设计

### 导航结构

```
Root Navigator (Stack)
├── Auth Stack（未登录时）
│   ├── LoginScreen
│   └── VerifyCodeScreen
└── Main Tab Navigator（已登录时）
    ├── Home Tab → HomeScreen
    ├── Cases Tab → CaseListScreen → CaseDetailScreen
    ├── Inbox Tab → InboxScreen → ConversationScreen
    ├── Todos Tab → DocumentListScreen → DocumentUploadScreen
    └── Profile Tab → ProfileScreen
```

### Tab 配置

| Tab | 图标 | 标签 | Screen |
|---|---|---|---|
| Home | 🏠 | ホーム | HomeScreen |
| Cases | 📋 | 案件 | CaseListScreen |
| Inbox | 💬 | メッセージ | InboxScreen |
| Todos | 📄 | 書類 | DocumentListScreen |
| Profile | 👤 | 設定 | ProfileScreen |

### 登录状态判断

```ts
// 根据 Token 存在与否切换 Auth / Main Stack
const hasToken = useAuthToken(); // 从 storage 读取
return hasToken ? <MainTabs /> : <AuthStack />;
```

## 实现规范

1. 使用 `@react-navigation/native` + `@react-navigation/bottom-tabs`
2. Tab 内嵌 Stack（Cases / Inbox / Todos 有 detail 页面）
3. 参考现有 `navigation/` 目录结构
4. Tab 图标暂用文字或 emoji，后续替换

## 测试要求

- 验证登录/未登录状态下导航切换正确
- 验证各 Tab 可渲染对应 Screen

## DoD

- [ ] Auth Stack + Main Tab 导航配置完成
- [ ] 5 个 Tab 可正常切换
- [ ] 未登录 → Auth Stack，已登录 → Main Tabs
- [ ] Detail 页面可从列表跳转
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/mobile
npm run guard
```

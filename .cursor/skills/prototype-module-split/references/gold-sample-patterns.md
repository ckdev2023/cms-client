# Prototype Module Split Examples

## 客户模块金样本

客户模块已经具备一套较完整的拆分样例，可直接作为其他后台模块的对照：

- 入口页：`packages/prototype/admin/customers/index.html`
- 契约基线：`packages/prototype/admin/customers/P0-CONTRACT.md`
- 拆分架构：`packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md`
- 迁移映射：`packages/prototype/admin/customers/MIGRATION-MAPPING.md`
- 机器清单：`packages/prototype/admin/customers/split-manifest.json`

## 目录模式

```text
customers/
├── index.html
├── P0-CONTRACT.md
├── SPLIT-ARCHITECTURE.md
├── MIGRATION-MAPPING.md
├── split-manifest.json
├── sections/
│   ├── header.html
│   ├── filters.html
│   ├── table.html
│   ├── pagination.html
│   ├── create-modal.html
│   └── toast.html
├── data/
│   └── customer-config.js
└── scripts/
    ├── customer-page.js
    ├── customer-modal.js
    ├── customer-drafts.js
    └── customer-bulk-actions.js
```

## 拆分判断示例

### section

- `sections/header.html`: 页面标题和“添加客户”入口
- `sections/filters.html`: scope 切换、搜索、筛选、重置
- `sections/table.html`: 列表结构、批量栏、tbody 模板
- `sections/create-modal.html`: 新建客户弹窗

### data

- `data/customer-config.js`: columns、filters、form fields、toast preset、storage key

### scripts

- `scripts/customer-page.js`: 页面启动、toast、hash `#new`、草稿恢复入口
- `scripts/customer-modal.js`: modal 开关、校验、去重提示、序列化
- `scripts/customer-drafts.js`: localStorage 草稿 CRUD 与草稿行渲染
- `scripts/customer-bulk-actions.js`: 全选/单选、批量指派、批量调组

### shared 候选

- `shared/styles/tokens.css`
- `shared/styles/components.css`
- `shared/styles/shell.css`
- `shared/shell/side-nav.html`
- `shared/shell/topbar.html`
- `shared/shell/mobile-nav.html`
- `shared/scripts/mobile-nav.js`

## 生产映射示例

客户模块采用的映射方式可以复用于其他模块：

- `sections/*.html` -> `features/<module>/ui/*`
- `scripts/*page*.js` -> `features/<module>/model/use<Module>ListViewModel`
- `scripts/*modal*.js` -> `features/<module>/model/useCreate<Module>Modal`
- `scripts/*draft*.js` -> `features/<module>/model/use<Module>Drafts`
- `scripts/*bulk*.js` -> `features/<module>/model/use<Module>BulkActions`
- `data/*config.js` -> `domain/<module>/*` 常量与类型
- `shared/shell/*.html` -> `shared/ui/AppShell` 相关组件

## 套用到其他模块时的改名规则

不要复制 `customer-*` 命名到别的模块。要保持的是职责结构，不是具体单词。

例如案件模块可对应为：

- `case-page.js`
- `case-modal.js`
- `case-bulk-actions.js`
- `data/case-config.js`
- `sections/detail-drawer.html`

## 建议新增的机器清单

如果其他模块尚未有 `split-manifest.json`，优先先生成它，再补文档细节。这样后续可以：

- 批量检查模块拆分完整度
- 用脚本补文档骨架
- 让 agent 读取统一结构，而不是重复靠全文搜索推断

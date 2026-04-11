# 案件新建页原型拆分架构说明

> 本文档定义 `packages/prototype/admin/case/create.html` 的目录职责、边界和拆分顺序。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1 当前目标

本次拆分目标不是重写整个案件模块，而是把“新增案件”落到 `case/` 目录内，并形成后续可继续扩展的原型工件：

- `create.html` 作为新增案件入口页
- `sections/` 保存页面结构边界
- `data/` 保存模板、客户、负责人等声明式演示配置
- `scripts/` 保存页面编排与 modal 行为
- `index.html` 作为列表页入口，跳转到 `create.html`

## 2 目标目录结构

```text
packages/prototype/admin/case/
├── create.html                         ← 新增案件入口
├── index.html                          ← 案件列表入口
├── P0-CONTRACT.md
├── SPLIT-ARCHITECTURE.md
├── MIGRATION-MAPPING.md
├── split-manifest.json
├── sections/
│   ├── create-header.html              ← 面包屑、标题、范围 chips
│   ├── create-stepper.html             ← 四步 stepper
│   ├── business-form.html              ← 模板、申请类型、Group、案件标题
│   ├── related-parties.html            ← 主申请人、关联人、资料模板、家族签/技人国说明
│   ├── assignment-review.html          ← 分派字段、自动动作、创建汇总
│   ├── customer-modal.html             ← 快速新建主申请人/关联人 modal
│   └── toast.html                      ← 创建反馈 toast
├── data/
│   ├── case-list.js                    ← 列表页示例数据
│   └── case-create-config.js           ← 新建页模板、客户、负责人、toast 配置
└── scripts/
    ├── case-page.js                    ← 列表页交互
    ├── case-create-page.js             ← stepper、模板切换、汇总、创建反馈
    └── case-create-modal.js            ← 快速新建客户/关联人 modal
```

## 3 模块职责定义

### 3.1 入口页

#### `create.html`

职责：

1. 引入 `shared/styles/*` 与 `shared/scripts/*`
2. 组装 `sections/*.html` 对应的页面边界
3. 提供页面专有样式，如 stepper、模板卡片、汇总卡片
4. 通过 `<script src>` 依次挂载 config、page、modal

#### `index.html`

职责：

1. 保留案件列表页
2. 把顶部入口从旧的 `case-create.html` 改为 `create.html`
3. 作为新增案件原型的回流入口

### 3.2 sections

| 文件 | 职责 | 对应契约 |
|------|------|---------|
| `create-header.html` | 标题、副标题、chips | §1 必保留区块 |
| `create-stepper.html` | 四步进度视觉层 | §1 必保留区块 |
| `business-form.html` | 模板选择、申请类型、Group、案件标题 | §2.1 |
| `related-parties.html` | 主申请人、关联人、资料模板、家族/工作场景 | §2.2, §3 |
| `assignment-review.html` | 负责人、期限、金额、自动动作、最终汇总 | §2.3, §5 |
| `customer-modal.html` | 快速新建客户/关联人 modal | §4 |
| `toast.html` | 创建反馈 toast | §7 |

### 3.3 data

#### `data/case-create-config.js`

集中声明：

- `groups`
- `owners`
- `customers`
- `templates`
- `defaultState`
- `toast`

边界规则：

- 只放声明式配置和静态示例数据
- 不出现 `querySelector`、`addEventListener`、DOM 写入

### 3.4 scripts

| 文件 | 职责 | 依赖 |
|------|------|------|
| `scripts/case-create-page.js` | stepper、模板切换、主申请人回填、资料模板渲染、汇总、创建反馈 | `data/case-create-config.js` |
| `scripts/case-create-modal.js` | modal 打开/关闭、字段校验、回填主申请人或关联人 | `scripts/case-create-page.js` 暴露的 `window.CaseCreatePageApi` |

## 4 Shared 与页面层边界

### 4.1 归入 shared 的能力

- `shared/styles/tokens.css`
- `shared/styles/components.css`
- `shared/styles/shell.css`
- `shared/scripts/mobile-nav.js`
- `shared/scripts/navigate.js`

### 4.2 留在 case/create 的能力

- 模板卡片文案与切换逻辑
- 家族签批量模式提示
- 资料模板分组与必交文案
- 快速新建主申请人 / 关联人的 modal 语义
- 创建案件汇总与成功反馈

### 4.3 明确不提升到 shared

- “家族滞在”“技人国”“CaseParty”“资料清单”等案件语义
- 主申请人 / 配偶 / 子女 / 雇主联系人等角色文案
- 跨组建案原因字段

## 5 拆分步骤

1. 复用 `shared` 样式与导航脚本，建立 `create.html`
2. 把页面结构拆到 `sections/`
3. 抽出 `data/case-create-config.js`
4. 把页面交互拆成 `case-create-page.js` 和 `case-create-modal.js`
5. 回写 `index.html`、`customers/index.html`、`admin-prototype.html` 的新建入口
6. 更新 `P0-CONTRACT.md`、`MIGRATION-MAPPING.md`、`split-manifest.json`

## 6 Demo-only 说明

以下逻辑只服务原型演示，必须保留标注：

- 创建案件不真实落库
- 资料模板勾选不驱动真实进度
- `#family-bulk` 只切换默认模式
- 快速新建客户仅回填到当前页面状态
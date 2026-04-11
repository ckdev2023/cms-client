# 提取判断规则

> 本文件是 `shared-shell-extractor` skill 的参考资产。
> 帮助判断一个样式/HTML 片段/脚本应该放在 `shared/` 还是留在页面层。

---

## 核心判断原则

**删掉模块名仍然成立 → `shared/`**
**依赖模块字段 / 状态机 / 业务概念 → 留在模块页层**

---

## 1. 样式提取判断

### 属于 shared/styles/ 的

| 类型 | 判断标准 | 示例 |
|------|---------|------|
| CSS 变量（Token） | 两个及以上页面都用到 | `--bg`, `--surface`, `--apple-blue` |
| 通用组件类 | 类名不含业务名词，多页面复用 | `.btn-primary`, `.chip`, `.badge`, `.apple-card` |
| 布局类 | App Shell、导航、顶栏的布局规则 | `.app-shell`, `.side-nav`, `.topbar` |
| 表格基础类 | 不含业务列定义的表格壳子 | `.apple-table th`, `.apple-table td` |
| 弹窗基础类 | 不含业务字段的弹窗壳子 | `.modal-backdrop`, `.apple-modal` |
| 表单基础类 | 不含业务字段的表单样式 | `.apple-input`, `.apple-label` |
| 响应式断点 | 跨页面的 `@media` 规则 | `@media (min-width: 1024px)` 网格切换 |

### 留在页面层的

| 类型 | 判断标准 | 示例 |
|------|---------|------|
| 业务特有类 | 类名含业务名词，仅一个页面用 | `.customer-draft-row`, `.billing-overdue-highlight` |
| 状态特有样式 | 依赖业务状态枚举 | `.case-status-S3 { color: orange }` |
| 页面布局微调 | 只有本页面需要的间距/宽度调整 | `.billing-summary-grid { grid-template-columns: ... }` |

---

## 2. Shell HTML 提取判断

### 属于 shared/shell/ 的

| 片段 | 判断标准 |
|------|---------|
| 桌面侧边导航 | 导航项列表在所有页面一致（只有 `aria-current` 不同） |
| 移动端导航 | 汉堡菜单和抽屉在所有页面一致 |
| 顶部栏 | 搜索框和用户头像在所有页面一致 |

### 留在页面层的

| 片段 | 判断标准 |
|------|---------|
| 页面标题区 | 每个页面标题不同 |
| 筛选区 | 每个页面筛选条件不同 |
| 页面专有工具栏 | 按钮和操作因页面而异 |

---

## 3. 脚本提取判断

### 属于 shared/scripts/ 的

| 脚本 | 判断标准 |
|------|---------|
| mobile-nav.js | 汉堡菜单开关逻辑，所有页面一致 |
| navigate.js | 页面跳转辅助，无业务逻辑 |
| 未来可能：theme-toggle.js | 主题切换逻辑 |

### 留在页面层的

| 脚本 | 判断标准 |
|------|---------|
| {module}-page.js | 页面初始化，依赖模块 DOM 结构 |
| {module}-modal.js | 弹窗逻辑，依赖模块表单字段 |
| {module}-bulk-actions.js | 批量操作，依赖模块数据结构 |
| {module}-filters.js | 筛选逻辑，依赖模块筛选维度 |

---

## 4. 变量合并策略

当两个页面的 `:root` 变量有同名但不同值时：

```
场景 1：完全一致
  → 保留一份到 tokens.css

场景 2：值不同但语义相同（如圆角 12px vs 14px）
  → 选择更通用的值，在 tokens.css 中定义
  → 如果差异有设计原因，保留两个变量名（如 --radius 和 --radius-lg）

场景 3：名称不同但值相同（如 --primary 和 --apple-blue 都是 #007AFF）
  → 在 tokens.css 中保留标准名（--apple-blue）
  → 添加兼容别名（--primary: var(--apple-blue)）
  → 逐步迁移页面到标准名

场景 4：一方有另一方没有
  → 判断是否两个以上页面需要
  → 是 → 加入 tokens.css
  → 否 → 留在页面层
```

---

## 5. 提取后回归要点

| # | 回归项 | 常见问题 |
|---|--------|---------|
| 1 | 颜色一致 | 样式优先级变化导致颜色偏移 |
| 2 | 按钮/徽章外观一致 | `!important` 冲突 |
| 3 | 导航高亮正确 | `aria-current="page"` 未设置或设置在错误项 |
| 4 | 移动导航可用 | 脚本路径错误导致 404 |
| 5 | 弹窗/模态框可用 | `z-index` 或 backdrop 样式缺失 |
| 6 | 子目录页面正常 | `../` 前缀缺失导致 CSS/JS 404 |
| 7 | 无新增控制台错误 | 脚本引用顺序错误或缺失 |

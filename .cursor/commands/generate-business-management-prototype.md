为“经营管理签”生成功能完整、可直接预览的高仿真后台原型页面。

严格按以下顺序调用并遵循仓库现有 skills：

1. 使用 `requirement-gate`
   - 读取并结构化分析：
     - `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md`
     - `docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md`
   - 先形成明确的需求边界、必须能力、非目标、验收口径，再进入后续阶段。

2. 使用 `page-spec-generator`
   - 基于上一步的结构化需求，生成或补齐页面规格。
   - 明确页面字段、操作、状态、异常态、权限与可见性。
   - 不要跳过规格直接开始写原型。

3. 使用 `admin-module-scaffold`
   - 在 `packages/prototype/admin/business-management/` 下创建模块。
   - 模块中文名使用“经营管理签”。
   - 生成可运行入口和标准目录结构，而不是空目录。

4. 在 scaffold 基础上继续实现完整高仿真原型，不要停留在骨架
   - 最终必须产出完整的 `HTML + CSS + 必要 JS`。
   - 必须是可直接预览、可点击演示的页面，不接受只有 TODO、占位文案或线框级页面。
   - 页面内容要覆盖需求中的关键流程、信息区块、表单/表格、状态展示、操作按钮、提示反馈。

5. 结合 `design/gyosei-os-admin/DESIGN.md` 作为视觉与交互基线
   - 风格对齐现有 admin prototype：浅色留白、卡片层级、主按钮、状态标签、导航壳层、表单样式、表格风格。
   - 优先复用：
     - `packages/prototype/admin/shared/styles/tokens.css`
     - `packages/prototype/admin/shared/styles/components.css`
     - `packages/prototype/admin/shared/styles/shell.css`
     - `packages/prototype/admin/shared/shell/*`
     - `packages/prototype/admin/shared/scripts/*`
   - 不要另起一套新的设计 token 或组件样式体系。

6. 如页面样式、壳层、导航、公共脚本有重复或不一致，使用 `shared-shell-extractor`
   - 把可共享部分提取或对齐到 `shared/`。
   - 目标是让页面与现有 admin 原型风格统一，而不是做孤立页面。

7. 输出要求
   - 至少生成并完善：
     - `packages/prototype/admin/business-management/index.html`
     - `packages/prototype/admin/business-management/sections/*.html`
     - `packages/prototype/admin/business-management/scripts/*.js`
     - `packages/prototype/admin/business-management/data/*.js`
   - 如果规格需要，可同步补齐相关文档骨架或规格文档，但重点是最终原型页面本身完整可预览。

8. 实现约束
   - 以原型实现为目标，优先产出 HTML/CSS/JS 页面。
   - 不要把任务转成 React 页面或生产代码实现。
   - 不要只输出分析结论，必须真正生成文件。
   - 保持与仓库现有 `packages/prototype/admin/` 目录风格一致。

9. 完成后汇报
   - 实际调用了哪些 skills
   - 生成或修改了哪些文件
   - 原型入口文件路径
   - 哪些页面区块映射了需求文档
   - 哪些视觉/交互细节对齐了 `design/gyosei-os-admin/DESIGN.md`
   - 是否运行了 `npm run fix` 和 `npm run guard`

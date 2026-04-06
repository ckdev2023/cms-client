# E1: Custom 模块隔离

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | E1 |
| Phase | E — Custom 模块隔离 |
| 前置依赖 | Phase A 全部完成 |
| 后续解锁 | 无（独立可做） |
| 预估工时 | 0.5-1 天 |

## 目标

识别并隔离首家客户特有逻辑到 `custom/tenant-a/`，用 Feature Flag 控制开关，避免污染 core。

## 范围

### 需要创建的文件

- `packages/server/src/modules/custom/tenant-a/` — 目录 + 具体文件取决于盘点结果

### 需要审查的文件

- `packages/server/src/modules/core/` — 全部文件
- `packages/server/src/modules/templates/` — 模板配置

### 不可修改的目录

- `packages/server/src/modules/core/model/` — 核心类型不可改
- `packages/mobile/`

## 执行步骤

### Step 1：盘点

审查当前代码，标记以下类型的首家客户特有逻辑：

1. 特有字段（hardcoded 在核心模型中）
2. 特有状态流（写死在 service 中）
3. 特有导出格式
4. 特有通知规则
5. 特有审批动作
6. 特有 DTO 映射

输出盘点清单表：

| 文件 | 行号 | 特有逻辑描述 | 迁移目标 |
|---|---|---|---|
| xxx.ts | L42 | ... | custom/tenant-a/xxx.ts |

### Step 2：创建 custom 目录结构

```
modules/custom/
  tenant-a/
    config.ts          — 特有配置
    dtoMapping.ts      — 特有 DTO 映射
    exporters.ts       — 特有导出
    notifications.ts   — 特有通知
    index.ts           — 统一导出
```

### Step 3：迁移

- 将特有逻辑抽取到 custom 文件
- 在 core service 中通过 Feature Flag 判断是否调用 custom 逻辑
- Feature Flag key 示例：`tenant_a_custom_export`、`tenant_a_custom_flow`

### Step 4：验证

- 开启 Feature Flag 时行为不变
- 关闭 Feature Flag 时走通用逻辑
- core 中不再有首家客户特有代码

## 实现规范

1. custom 模块可以依赖 core，但 core 不依赖 custom
2. custom 逻辑通过 Feature Flag + 策略模式注入
3. 如当前代码中暂无明显特有逻辑，只需创建目录骨架 + 文档

## 测试要求

- 已有测试不受影响
- 新增 Feature Flag 开关测试
- 验证 custom 逻辑在 flag on/off 时行为正确

## DoD

- [ ] 盘点清单已输出
- [ ] custom/tenant-a/ 目录已创建
- [ ] 已识别的特有逻辑已迁移（或确认当前无特有逻辑）
- [ ] Feature Flag 控制开关
- [ ] core 中无首家客户特有代码
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
# 检查 core 目录中是否仍有特有逻辑：
grep -r "tenant.a\|tenant_a\|特有" src/modules/core/ || echo "Clean"
```

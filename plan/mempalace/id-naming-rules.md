# MemPalace 标识符稳定命名规则

## 1. 目标

为 `source_id`、`document_id`、`chunk_id`、`layer`、`wing`、`room` 六类核心标识符冻结命名格式与派生规则，确保同一份输入无论何时索引，都产生相同的 ID，且 ID 之间的层级关系可直接从命名中推断。

## 2. 通用约束

1. 所有标识符只使用 ASCII 小写字母、数字和短横线 `-`；不使用下划线、空格、大写或 CJK 字符。
2. 路径中的 CJK 目录名和文件名统一转为 `kebab-pinyin` 或已冻结的英文短名（映射表见 §8）。
3. 标识符中不嵌入时间戳或随机后缀；需要版本区分时通过外部 `run_id` 或 `snapshot_id` 记录。
4. 所有标识符长度上限 128 字符。
5. 标识符一经写入索引即为冻结值；若因文件重命名或路径变更导致 ID 变化，视为新文档，旧 ID 标记 `deprecated`。

## 3. layer

`layer` 表达来源优先级层，取值固定为以下枚举：

| layer | 含义 | 对应 authority_layer |
|---|---|---|
| `l1` | 权威定义层 | `L1` |
| `l2` | 编译结论层 | `L2` |
| `l3` | 原始输入层 | `L3` |

规则：
- 使用小写 `l` 前缀 + 数字。
- 不允许自定义扩展层级。

## 4. wing

`wing` 表达大来源域，取值从 `taxonomy-spec.md` §4 冻结集合中选取。

格式：`<domain>-<layer-or-carrier>`

当前冻结值：

| wing | 来源根目录 |
|---|---|
| `gyoseishoshi-p0` | `docs/gyoseishoshi_saas_md/P0/` |
| `gyoseishoshi-p1` | `docs/gyoseishoshi_saas_md/P1/` |
| `office-process` | `docs/事务所流程/` |
| `admin-prototype` | `packages/prototype/admin/` |
| `engineering-rules` | `AGENTS.md`、`.cursor/rules/` |

规则：
- 使用 `kebab-case`，全小写。
- 新增 wing 必须先在 `taxonomy-spec.md` 冻结后才可使用。
- wing 名不得与 room 名重复。

## 5. room

`room` 表达 wing 内的主题切分。

格式：`<theme>`

当前冻结值：`state-machine`、`field-ownership`、`workflow-gates`、`biz-mgmt`、`scenario-materials`、`submission-audit`

规则：
- 使用 `kebab-case`，全小写。
- 只表达稳定主题名词，不使用文件名、页面名或阶段编号。
- 不得与任何 wing 名重复。
- 新增 room 必须先在 `taxonomy-spec.md` 冻结后才可使用。

## 6. source_id

`source_id` 标识 `manifest.json` 中的一个来源条目。

格式已在 `ingestion-manifest.md` §6 冻结，与 `manifest.json` 中 `source_entries[].source_id` 一一对应。

当前冻结值：`p0-core-md`、`p0-navigation-md`、`p0-gate-artifacts`、`p1-core-md`、`p1-gate-artifacts`、`office-process-md`、`office-process-scenarios`、`office-process-config`、`compiled-output-buffer`、`raw-input-buffer`

规则：
- 使用 `kebab-case`，全小写。
- 一个 source_id 对应一组 include_globs / include_ext / exclude_globs。
- 若来源范围变更导致需要拆分或合并，必须废弃旧 source_id 并新建，不允许原地修改语义。

## 7. document_id

`document_id` 唯一标识一个已索引的物理文件。

### 7.1 派生公式

```
document_id = <source_id> + ":" + normalize_path(relative_file_path)
```

其中 `normalize_path` 规则：
1. 以仓库根为基准取相对路径。
2. CJK 目录名和文件名按 §8 映射表转为英文短名。
3. 路径分隔符 `/` 替换为 `-`。
4. 去掉文件扩展名。
5. 全部转小写。

### 7.2 示例

| 物理路径 | source_id | document_id |
|---|---|---|
| `docs/gyoseishoshi_saas_md/P0/03-共享阶段模型.md` | `p0-core-md` | `p0-core-md:docs-gyoseishoshi-saas-md-p0-03-shared-stage-model` |
| `docs/gyoseishoshi_saas_md/P0/06-页面规格/客户-需求门禁/artifacts/requirement_contract.json` | `p0-gate-artifacts` | `p0-gate-artifacts:docs-gyoseishoshi-saas-md-p0-06-page-spec-customer-gate-artifacts-requirement-contract` |
| `docs/事务所流程/在留資格別必要情報一覧Ver2.scenarios/biz-mgmt-cert-1y.md` | `office-process-scenarios` | `office-process-scenarios:docs-office-process-visa-req-v2-scenarios-biz-mgmt-cert-1y` |
| `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md` | `p1-core-md` | `p1-core-md:docs-gyoseishoshi-saas-md-p1-01-biz-mgmt-extension-scope` |

### 7.3 约束

- 同一物理文件的 document_id 必须全局唯一。
- 文件不移动、不重命名时，document_id 恒定不变。
- 文件被移动或重命名后，旧 document_id 标记 `deprecated`，新路径产生新 document_id。

## 8. CJK 路径短名映射表

以下映射表冻结 CJK 目录名和文件名到英文短名的固定转换，确保 document_id 稳定且可读。

| CJK 原名 | 英文短名 |
|---|---|
| `页面规格` | `page-spec` |
| `客户` | `customer` |
| `案件` | `case` |
| `收费与财务` | `billing` |
| `任务与提醒` | `task-reminder` |
| `需求门禁` | `gate` |
| `共享阶段模型` | `shared-stage-model` |
| `结构化总索引与交叉映射` | `cross-index` |
| `文档维护与版本记录` | `doc-maintenance` |
| `事务所流程` | `office-process` |
| `在留資格別必要情報一覧Ver2` | `visa-req-v2` |
| `经营管理签扩展范围与落地计划` | `biz-mgmt-extension-scope` |
| `经营管理签技术落地清单` | `biz-mgmt-tech-landing` |
| `经营管理签高仿真原型需求门禁` | `biz-mgmt-prototype-gate` |
| `页面规格-客户经营管理签签约前承接` | `page-spec-customer-biz-mgmt-pre-sign` |

规则：
- 新文件若含 CJK 路径段，必须先在本表冻结短名，再进入索引。
- 短名只使用 `kebab-case`，长度不超过 48 字符。
- 一旦冻结不可更改（可追加新条目，不可修改已有映射）。

## 9. chunk_id

`chunk_id` 唯一标识一个文档内的切块。

### 9.1 派生公式

```
chunk_id = <document_id> + "#" + <chunk_index>
```

其中 `chunk_index` 为零起始、三位补零的序号，按文档内切块的物理顺序递增。

### 9.2 示例

| document_id | chunk_index | chunk_id |
|---|---|---|
| `p0-core-md:docs-gyoseishoshi-saas-md-p0-03-shared-stage-model` | `000` | `p0-core-md:docs-gyoseishoshi-saas-md-p0-03-shared-stage-model#000` |
| （同上） | `001` | `p0-core-md:docs-gyoseishoshi-saas-md-p0-03-shared-stage-model#001` |
| `office-process-scenarios:docs-office-process-visa-req-v2-scenarios-biz-mgmt-cert-1y` | `003` | `office-process-scenarios:docs-office-process-visa-req-v2-scenarios-biz-mgmt-cert-1y#003` |

### 9.3 约束

- 同一 document_id 下 chunk_index 连续且不跳号。
- 文档内容变更导致重新切块时，所有 chunk_id 按新切块顺序重新生成，旧 chunk_id 整批失效。
- chunk_index 上限 `999`；若超出，说明文档过大应先拆分源文件。

## 10. 各标识符的层级关系

```
layer
  └── wing
        └── room
              └── source_id  (manifest 条目)
                    └── document_id  (物理文件)
                          └── chunk_id  (文档切块)
```

从 chunk_id 可逆向解析出 document_id（`#` 前）、source_id（`:` 前），再通过 `manifest.json` 查到 wing / layer / room 归属。

## 11. 关键不变量

1. `layer` ∈ {`l1`, `l2`, `l3`}，固定枚举。
2. `wing` ∈ `taxonomy-spec.md` 冻结集合。
3. `room` ∈ `taxonomy-spec.md` 冻结集合。
4. `source_id` ∈ `manifest.json` 冻结集合。
5. `document_id` = `<source_id>:<normalized_path>`，同一文件路径恒产出相同值。
6. `chunk_id` = `<document_id>#<chunk_index>`，同一文档同一切块策略恒产出相同值。
7. 任何标识符变更（路径移动、来源重划）都视为新 ID + 旧 ID 废弃，不允许原地修改语义。

## 12. 直接依据

- `plan/mempalace/ingestion-manifest.md`
- `plan/mempalace/manifest.json`
- `plan/mempalace/taxonomy-spec.md`
- `plan/mempalace/source-priority.md`
- `plan/mempalace/index-baseline-plan.md`

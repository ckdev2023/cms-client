# 在留資格別必要情報一覧 Ver2 - AI 优化 Markdown 版

## 文档定位

- 来源文件：`docs/事务所流程/在留資格別必要情報一覧Ver2.xlsx`
- 解析对象：`Sheet1`
- 目标：把原始 Excel 矩阵转成适合 AI 检索、问答、规则抽取和后续再编译的 Markdown
- 状态语义：`〇 = required`，`△ = conditional`，空白 = `not_listed`
- 额外规则：若单元格除 `〇` / `△` 外还附带文字，则保留到 `note`
- 注意：本文件是结构化整理与分析稿，不替代最终入管受理口径

## 一页结论

- 这是一张“资料项 × 在留资格/办理场景”的矩阵表。
- 列维度共 7 个场景，其中 `会社設立` 更像“经营管理签的前置公司设立材料包”，不是独立在留资格。
- 行维度共 52 条有效资料项，只有 `パスポート写しウツ` 在全部 7 个场景中都被明确标记为必需。
- `その他事案により必要な書類ホカジアンヒツヨウショルイ` 在全部场景都出现，但都是条件项，说明源表是“基础底表”，不是封闭清单。
- 材料最多的是 `経営管理 / 認定1年`，共 31 项（27 必需 + 4 条件），审查重点明显落在公司实体、办公场地、资本与税务。
- 其次是 `技人国 / 認定`，共 26 项（21 必需 + 5 条件），重点在学历/成绩/职历、雇佣条件与雇主实体。
- `企業内 / 転勤` 项目数最少，但有“日本/本国”这种来源地域备注，说明不能只用布尔值建模。

## 结构化摘要

| 场景 ID | 场景 | 必需项 | 条件项 | 合计列出 | 分析结论 |
|---|---|---:|---:|---:|---|
| `biz_mgmt_cert_4m` | 経営管理 / 認定4か月 | 18 | 4 | 22 | 偏向创业前置审查，强调申请人背景、资本来源、来日与认定历史。 |
| `company_setup` | 会社設立 | 7 | 2 | 9 | 属于经营管理签的前置材料包，集中在资本金入账、印章和基础设立动作。 |
| `biz_mgmt_cert_1y` | 経営管理 / 認定1年 | 27 | 4 | 31 | 材料最完整，兼顾个人背景、办公场地、公司法人与税务资料。 |
| `biz_mgmt_renewal` | 経営管理 / 期間更新 | 12 | 2 | 14 | 更强调持续经营事实、税务和在留中信息。 |
| `eng_humanities_intl_cert` | 技人国 / 認定 | 21 | 5 | 26 | 重点落在学历/成绩/职历、雇佣条件、雇主实体和合规性。 |
| `eng_humanities_intl_renewal` | 技人国 / 期間更新 | 13 | 2 | 15 | 更新更偏在留卡、住民票、纳税、社保与工资源泉信息。 |
| `intra_company_transfer` | 企業内 / 転勤 | 11 | 2 | 13 | 更像集团内部调动场景，突出转勤命令、收入证明、股东/交易和日本侧资料。 |

## 执行版用法

### 标准执行流程

1. 先确定场景，只能从 7 个 `scenario_id` 中选 1 个主场景。
2. 先收集全局共通硬必需项：`パスポート写しウツ`。
3. 再收集该场景下所有 `required` 项。
4. 然后逐条判断该场景下的 `conditional` 项是否触发，不能因为是条件项就直接跳过。
5. 最后检查 `note` 列，确认是否存在 `日本`、`本国・日本` 这类来源地域说明。
6. 输出时必须区分 4 个状态：`已收到`、`缺失`、`待确认是否触发`、`需补说明/翻译/原件来源`。

### 执行时的最小判断规则

- 看到 `required`：默认必须收。
- 看到 `conditional`：必须追问触发条件，不可直接当可不交。
- 看到 `not_listed`：仅表示源表未列出，不代表绝对不需要。
- 看到 `note`：说明该材料还有补充口径，必须连同备注一起执行。

### 推荐交付格式

对每个案件，建议最终整理成这 4 组：

- `基础必需材料`
- `场景专属必需材料`
- `条件触发材料`
- `个案补充材料`

## 场景最小执行包

### `biz_mgmt_cert_4m` - 経営管理 / 認定4か月

- 先收：护照、证件照、经历史/职历、学历/资格、资本来源、来日与认定历史。
- 重点追：`会社名と事業目的予定`、`事務所予定物件資料`、`事務所設置委任状`。
- 高风险漏项：资本证明链、来日履历、既往认定/不许可记录。

### `company_setup` - 会社設立

- 先收：护照、资本金入账图片、银行卡正反面、印鉴证明、在留卡、公司实印。
- 重点追：`会社名と事業目的予定`。
- 高风险漏项：入资证据与印章/印鉴材料不一致。

### `biz_mgmt_cert_1y` - 経営管理 / 認定1年

- 先收：认定4个月阶段的大部分个人与资金材料。
- 再补：办公室租赁合同、事务所照片、平面图、定款、设立届、役员报酬议事录。
- 高风险漏项：公司设立后的实体经营证明是否闭环。

### `biz_mgmt_renewal` - 経営管理 / 期間更新

- 先收：住民票、纳税资料、在留卡、电话号码、公司謄本、工资源泉资料。
- 重点追：`取引先の名刺や契約書`。
- 高风险漏项：只有存续材料，没有经营持续性材料。

### `eng_humanities_intl_cert` - 技人国 / 認定

- 先收：护照、证件照、学历/学位/成绩、经历史、资格、地址、在日亲族情况。
- 再补：雇用条件通知书、公司案内、公司謄本、决算/申告、纳税、雇保号码、员工列表。
- 高风险漏项：学历链不完整、劳动条件不完整、雇主主体资料不足。

### `eng_humanities_intl_renewal` - 技人国 / 期間更新

- 先收：护照、证件照、住民票、纳税资料、电话号码、在留卡、健康保险证。
- 再补：公司謄本、工资源泉资料、雇保号码、员工列表。
- 高风险漏项：税务、社保和在职证明链断裂。

### `intra_company_transfer` - 企業内 / 転勤

- 先收：护照、证件照、经历史/在职证明、收入资料、公司謄本、工资源泉资料。
- 再补：`転勤辞令`、`譲渡契約書コピー`、`株主名簿`。
- 特别注意：`直近の決算報告書...` 标注了 `本国・日本`，`株主名簿` 标注了 `日本`。
- 高风险漏项：集团内部调动关系证明不足，或日本侧与本国侧资料不匹配。

## 深度分析

### 1. 共通项非常少

- 全部场景都“必需”的只有 `パスポート写しウツ`。
- 全部场景都“至少被列出”的只有 2 项：`パスポート写しウツ` 与 `その他事案により必要な書類ホカジアンヒツヨウショルイ`。
- 这说明后续若做 AI 问答、表单向导或规则引擎，不能先做一张统一清单再删减，而应以“按签种分别建模”为主。

### 2. 经营管理签被拆成四层逻辑

- `会社設立` 是前置准备，不是签证结果。
- `認定4か月` 偏“人 + 资金 + 来日背景”，比如资本来源、来日履历、既往认定/不许可历史、预计公司名与事業目的。
- `認定1年` 进入“公司实体已落地”阶段，新增办公室租赁合同、事务所照片、平面图、定款、设立届、役员报酬议事录等。
- `期間更新` 反而回收成“持续经营证明”，强调纳税、住民票、交易证明等经营延续性材料。

### 3. 技人国的核心判断轴是“资质 + 雇佣 + 雇主”

- `技人国 / 認定` 独有特征很明显，包含学位证明、成绩证明、雇用条件通知书、公司案内等。
- `技人国 / 期間更新` 新增项很少，说明更新更依赖既有在留状态与就业持续事实，而不是重新证明学历。

### 4. 企业内转勤不能简单当成布尔矩阵

- 该列含有 `〇本国・日本`、`〇日本` 这样的附注。
- 这意味着后续如果要导入系统配置，至少要保留 `status + raw_note` 两字段，而不是只存 `required/optional`。

### 5. 源表更适合做“底表”，不适合直接做最终提交清单

- `その他事案により必要な書類ホカジアンヒツヨウショルイ` 在第 33 行和第 55 行重复出现。
- 第 56/57 行还残留 `本人情報` / `会社情報` 孤立文本，像视觉分组残片，不是稳定结构。
- 多数资料名把标题与读音串联在一起，不利于机器检索、去重和后续字段映射。
- `△` 只表达“条件性需要”，没有告诉你“什么时候需要”，这部分还要补业务规则。

## 推荐的 AI 建模字段

- `scenario_id`
- `document_label_source`
- `status`
- `raw_note`
- `source_row`
- `document_label_normalized`
- `trigger_condition`

## 执行清单模板

```md
# 案件资料收集清单

- 场景：`scenario_id`
- 案件负责人：
- 当前状态：资料收集中 / 待客户补件 / 待内部确认 / 可提交

## 1. 基础必需材料
- [ ] パスポート写しウツ

## 2. 场景专属必需材料
- [ ] ...

## 3. 条件触发材料
- [ ] 结婚证 / 出生证明是否触发
- [ ] 是否存在额外个案材料

## 4. 备注与特别说明
- [ ] 是否有日本 / 本国・日本等来源要求
- [ ] 是否需要翻译件
- [ ] 是否需要原件 / 复印件 / 图片

## 5. 收口检查
- [ ] required 项全部已覆盖
- [ ] conditional 项都已判断
- [ ] note 项都已处理
- [ ] 缺失项已明确责任人与补件时间
```

## 标准化矩阵

```csv
source_row,document_label_source,biz_mgmt_cert_4m,company_setup,biz_mgmt_cert_1y,biz_mgmt_renewal,eng_humanities_intl_cert,eng_humanities_intl_renewal,intra_company_transfer,note
4,パスポート写しウツ,required,required,required,required,required,required,required,
5,証明写真（3×4センチ）ショウメイシャシン,required,not_listed,required,required,required,required,required,
6,経歴書・履歴書ケイレキショリレキショ,required,not_listed,required,not_listed,required,not_listed,required,
7,大学等の卒業証明書（本国、日本両方、外国の場合翻訳文必要）ダイガクトウソツギョウショウメイショホンコクニホンリョウホウガイコクバアイホンヤクブンヒツヨウ,required,not_listed,required,not_listed,required,not_listed,not_listed,
8,学位の証明書（本国、日本両方、外国の場合翻訳文必要）ガクイショウメイショ,not_listed,not_listed,not_listed,not_listed,required,not_listed,not_listed,
9,大学等の成績証明書（本国、日本両方、外国の場合翻訳文必要）ダイガクトウセイセキショウメイショ,not_listed,not_listed,not_listed,not_listed,required,not_listed,not_listed,
10,営業許可証エイギョウキョカショウ,required,not_listed,required,not_listed,not_listed,not_listed,not_listed,
11,資格証明書(日本語能力、免許など）ニホンゴノウリョクメンキョ,required,not_listed,required,not_listed,required,not_listed,not_listed,
12,在職証明書、退職証明書など（経歴、職歴の証明）ザイショクショウメイショタイショクショウメイショケイレキショクレキショウメイ,required,not_listed,required,not_listed,required,not_listed,required,
13,資本金3000万円以上残高証明書シホンキンマンエンイジョウザンダカショウメイショ,required,not_listed,required,not_listed,not_listed,not_listed,not_listed,
14,3000万円入金の画像マンエンニュウキンガゾウ,not_listed,required,not_listed,not_listed,not_listed,not_listed,not_listed,
15,ｷｬｯｼｭｶｰﾄﾞ表裏面オモテウラメン,not_listed,required,not_listed,not_listed,not_listed,not_listed,not_listed,
16,資本金出所証明書、収入証明シホンキンシュッショショウメイショシュウニュウショウメイ,required,not_listed,required,not_listed,not_listed,not_listed,not_listed,
17,現在の住所ゲンザイジュウショ,required,not_listed,required,required,required,required,not_listed,
18,来日履歴ライニチリレキ,required,not_listed,required,not_listed,required,not_listed,not_listed,
19,直近の出入国日チョッキンシュツニュウコクヒ,required,not_listed,required,not_listed,not_listed,not_listed,not_listed,
20,在留資格認定の申請の有無ザイリュウシカクニンテイシンセイウム,required,not_listed,required,not_listed,not_listed,not_listed,not_listed,
21,在留資格認定の不許可の有無ザイリュウシカクニンテイフキョカウム,required,not_listed,required,not_listed,not_listed,not_listed,not_listed,
22,在日親族の有無（有の場合続柄、在留カード、同居の有無、勤務先通学先）ザイニチシンゾクウムアリバアイツヅキガラザイリュウドウキョウムキンムサキツウガクサキ,required,not_listed,required,required,required,required,not_listed,
23,結婚証明書（家族滞在の場合のみ）ケッコンショウメイショカゾクタイザイバアイ,conditional,not_listed,conditional,not_listed,conditional,not_listed,not_listed,
24,出生証明書（家族滞在の場合のみ）シュッショウショウメイショカゾクタイザイバアイ,conditional,not_listed,conditional,not_listed,conditional,not_listed,not_listed,
25,住民票ジュウミンヒョウ,not_listed,not_listed,required,required,not_listed,required,not_listed,
26,印鑑証明書（公証書）インカンショウメイショコウショウショ,not_listed,required,required,not_listed,not_listed,not_listed,not_listed,
27,直近の課税証明書・納税証明書チョッキンカゼイショウメイショノウゼイショウメイショ,not_listed,not_listed,not_listed,required,required,required,not_listed,
28,収入に関する資料シュウニュウカンシリョウ,not_listed,not_listed,not_listed,not_listed,not_listed,not_listed,required,
29,携帯電話番号ケイタイデンワバンゴウ,not_listed,not_listed,required,required,required,required,not_listed,
30,在留申請ｵﾝﾗｲﾝ控ザイリュウシンセイヒカ,not_listed,not_listed,not_listed,not_listed,conditional,not_listed,not_listed,
31,在留カードザイリュウ,not_listed,required,required,required,required,required,not_listed,
32,健康保険証ケンコウホケンショウ,not_listed,not_listed,not_listed,not_listed,not_listed,required,not_listed,
33,その他事案により必要な書類ホカジアンヒツヨウショルイ,conditional,conditional,conditional,conditional,conditional,conditional,conditional,
34,会社名と事業目的予定カイシャメイジギョウモクテキヨテイ,required,required,not_listed,not_listed,not_listed,not_listed,not_listed,
35,事務所予定物件資料ジムショヨテイブッケンシリョウ,required,not_listed,not_listed,not_listed,not_listed,not_listed,not_listed,
36,事務所設置委任状(受任者TEL含む)ジムショセッチイニンジョウジュニンシャフク,required,not_listed,not_listed,not_listed,not_listed,not_listed,not_listed,
37,事務所賃貸借契約書ジムショチンタイシャクケイヤクショ,not_listed,not_listed,required,not_listed,not_listed,not_listed,not_listed,
38,事務所写真ジムショシャシン,not_listed,not_listed,required,not_listed,not_listed,not_listed,not_listed,
39,事務所平面図（面積）ジムショヘイメンズメンセキ,not_listed,not_listed,required,not_listed,not_listed,not_listed,not_listed,
40,会社実印カイシャジツイン,not_listed,required,not_listed,not_listed,not_listed,not_listed,not_listed,
41,会社謄本（履歴事項全部証明書）３か月以内カイシャトウホンリレキジコウゼンブショウメイショゲツイナイ,not_listed,not_listed,required,required,required,required,required,
42,各種設立届（国税府税市税）カクシュセツリツトドケコクゼイフゼイシゼイ,not_listed,not_listed,required,not_listed,not_listed,not_listed,not_listed,
43,定款テイカン,not_listed,not_listed,required,not_listed,not_listed,not_listed,not_listed,
44,直近の決算報告書又は個人の場合は確定申告書チョクキンケッサンホウコクショマタコジンバアイカクテイシンコクショ,not_listed,not_listed,not_listed,not_listed,required,not_listed,required,intra_company_transfer:〇本国・日本ホンゴクニホン
45,前年分の給与所得の源泉徴収票等の源泉法定調書合計表ゼンネンブンキュウヨショトクゲンセンチョウシュウヒョウトウゲンセンホウテイチョウショゴウケイヒョウ,not_listed,not_listed,not_listed,required,required,required,required,
46,雇用保険適用事業者番号（雇用後加入義務有）コヨウホケンテキヨウジギョウシャバンゴウコヨウゴカニュウギムアリ,not_listed,not_listed,not_listed,required,required,required,not_listed,
47,従業員リスト（全従業員の人数、外国人従業員の人数、技能自実習生の人数）ジュウギョウインゼンジュウギョウインニンスウガイコクジンジュウギョウインニンスウギノウジジッシュウセイニンズウ,not_listed,not_listed,not_listed,not_listed,required,required,not_listed,
48,役員報酬株主総会議事録ヤクインホウシュウカブヌシソウカイギジロク,not_listed,not_listed,required,not_listed,not_listed,not_listed,not_listed,
49,取引先の名刺や契約書トリヒキサキ,not_listed,not_listed,required,required,not_listed,not_listed,not_listed,
50,雇用条件通知書（雇用開始年月日、給料、勤務場所、所属部署、役職、連絡先電話番号など記載）コヨウジョウケンツウチショコヨウカイシネンガッピキュウリョウキンムバショショゾクブショヤクショクレンラクサキデンワバンゴウキサイ,not_listed,not_listed,not_listed,not_listed,required,not_listed,not_listed,
51,会社案内（あれば）カイシャアンナイ,not_listed,not_listed,not_listed,not_listed,required,not_listed,not_listed,
52,転勤辞令テンキンジレイ,not_listed,not_listed,not_listed,not_listed,not_listed,not_listed,required,
53,譲渡契約書ｺﾋﾟｰジョウトケイヤクショ,not_listed,not_listed,not_listed,not_listed,not_listed,not_listed,required,
54,株主名簿カブヌシメイボ,not_listed,not_listed,not_listed,not_listed,not_listed,not_listed,required,intra_company_transfer:〇日本ニホン
55,その他事案により必要な書類ホカジアンヒツヨウショルイ,conditional,conditional,conditional,conditional,conditional,conditional,conditional,
```

## 源表问题清单

| 类型 | 位置 | 问题 | 建议 |
|---|---|---|---|
| 重复项 | 第 33 / 55 行 | `その他事案により必要な書類` 重复出现 | 合并成单一兜底项，并补触发条件 |
| 结构残留 | 第 56 / 57 行 | 出现 `本人情報` / `会社情報` 孤立文本 | 若继续维护源表，应做成真正分组标题 |
| 备注不统一 | 第 44 / 54 行 | 单元格同时承载“必需 + 地域说明” | 拆成 `status` 与 `raw_note` |
| 命名噪声 | 全表 | 标题与读音连写，不利于检索 | 增加 `document_label_normalized` |
| 规则缺口 | 全表 | `△` 没有解释何时触发 | 后续补 `trigger_condition` |

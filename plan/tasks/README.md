# 原子任务索引

> 共 40 个任务，分 7 个 Phase，按依赖关系排列

## 任务总览

### Phase S — Server 地基补全（新增）

| Task ID | 名称                           | Phase | 前置依赖 | 预估 | 状态    |
| ------- | ------------------------------ | ----- | -------- | ---- | ------- |
| S16     | 统一 Migration（新增实体建表） | S     | —        | 0.3d | ✅ 完成 |
| S15     | TimelineEntityType 扩展        | S     | S16      | 0.2d |         |
| S1      | Company 企业客户模块           | S     | S15, S16 | 0.5d |         |
| S2      | ContactPerson 联系人模块       | S     | S1, S15  | 0.5d |         |
| S13     | Customer 字段校验增强          | S     | —        | 0.3d |         |
| S4      | Case 字段扩展                  | S     | S1, S16  | 0.5d |         |
| S5      | Case 状态机完善                | S     | S4       | 0.5d |         |
| S3      | CaseParty 案件关联人           | S     | S2, S4   | 0.3d |         |
| S6      | DocumentFile 资料文件          | S     | S15, S16 | 0.5d |         |
| S7      | DocumentItem 状态扩展          | S     | S5       | 0.3d |         |
| S8      | CommunicationLog 沟通记录      | S     | S15, S16 | 0.5d |         |
| S9      | Task 任务模块                  | S     | S15, S16 | 0.5d |         |
| S10     | GeneratedDocument 文书生成     | S     | S15, S16 | 0.5d |         |
| S11     | BillingRecord 收费计划         | S     | S15, S16 | 0.5d |         |
| S12     | PaymentRecord 回款记录         | S     | S11      | 0.3d |         |
| S14     | Permissions Service scope      | S     | —        | 0.5d |         |
| S17     | Case 自动编号                  | S     | S4       | 0.3d |         |
| S18     | 资料完成率计算                 | S     | S7       | 0.2d |         |

### Phase A-F（已有）

| Task ID | 名称                     | Phase | 前置依赖     | 预估   |
| ------- | ------------------------ | ----- | ------------ | ------ |
| A1      | Customers CRUD 模块      | A     | —            | 0.5-1d |
| A2      | Cases CRUD 模块          | A     | A1           | 1-1.5d |
| A3      | DocumentItems CRUD 模块  | A     | A2           | 0.5-1d |
| A4      | Reminders CRUD 模块      | A     | A3           | 0.5d   |
| A5      | Permissions Service      | A     | A1, A2       | 0.5-1d |
| B1      | File Storage Adapter     | B     | —            | 0.5-1d |
| B2      | Notification Adapter     | B     | —            | 0.5d   |
| B3      | Translation Adapter      | B     | —            | 0.5d   |
| C1      | Reminder Job Handler     | C     | A4, B2       | 0.5d   |
| C2      | Notification Job Handler | C     | B2           | 0.5d   |
| C3      | Translation Job Handler  | C     | B3, D1       | 0.5d   |
| C4      | Export Job Handler       | C     | B1, B2       | 0.5-1d |
| C5      | Worker 注册              | C     | C1-C4        | 0.5d   |
| D1      | Portal Migration         | D     | Phase A done | 0.5d   |
| D2      | Portal RLS               | D     | D1           | 0.5d   |
| D3      | Portal 类型定义          | D     | D1           | 0.5d   |
| D4a     | AppUsers 模块            | D     | D2, D3       | 0.5d   |
| D4b     | Leads 模块               | D     | D4a          | 0.5-1d |
| D4c     | Conversations 模块       | D     | D4b          | 0.5d   |
| D4d     | Messages 模块            | D     | D4c, C3      | 1d     |
| D4e     | UserDocuments 模块       | D     | D4a, B1      | 0.5d   |
| D4f     | IntakeForms 模块         | D     | D4a, D4b     | 0.5d   |
| D5      | AppUser Auth             | D     | D4a, A5      | 1d     |
| E1      | Custom 模块隔离          | E     | Phase A done | 0.5-1d |
| F1      | Mobile Auth Feature      | F     | D5           | 1-2d   |
| F2      | Mobile Case Feature      | F     | F1, D4b, A2  | 1-1.5d |
| F3      | Mobile Inbox Feature     | F     | F1, D4c, D4d | 1.5-2d |
| F4      | Mobile Documents Feature | F     | F1, D4e      | 1d     |
| F5      | Mobile Profile Feature   | F     | F1, D4a      | 0.5d   |
| F6      | Mobile Navigation        | F     | F1-F5        | 0.5d   |

## 推荐执行顺序

### Phase S — Server 地基补全（优先执行）

```
S16(✅) → S15 → S1(Company) → S2(ContactPerson) → S4(Case扩展) → S3(CaseParty)
                                                     ↘ S5(状态机) → S7(DocItem状态) → S18(完成率)
S6(DocumentFile) + S8(CommunicationLog) + S9(Task)  ← 可并行
S10(GeneratedDocument) + S11(BillingRecord) → S12(PaymentRecord)
S13(Customer校验) + S14(Permissions) + S17(编号)  ← 可并行收尾
```

### 并行轨道 1（Server 核心）

```
A1 → A2 → A3 → A4 → A5
```

### 并行轨道 2（Server 基础设施）— 可与轨道 1 同时进行

```
B1, B2, B3 （三个互相独立）
```

### 汇合 → 异步任务

```
C1 (需 A4 + B2)
C2 (需 B2)
C3 (需 B3 + D1)
C4 (需 B1 + B2)
C5 (需 C1-C4)
```

### Portal 域

```
D1 → D2, D3 → D4a → D4b, D4e, D4f → D4c → D4d
                ↘ D5
```

### Custom 隔离 — 独立可做

```
E1 (需 Phase A done)
```

### Mobile — 最后执行

```
F1 → F2, F3, F4, F5 → F6
```

## 里程碑

| 里程碑 | 完成任务     | 验收                                        |
| ------ | ------------ | ------------------------------------------- |
| **M0** | S1-S18       | Server 地基补全（全部实体 + 状态机 + 权限） |
| **M1** | A1-A5, B1-B3 | 后台 CRUD API + 基础设施 Adapter            |
| **M2** | C1-C5        | 异步任务全链路                              |
| **M3** | D1-D5, E1    | Portal API + Custom 隔离                    |
| **M4** | F1-F6        | Mobile MVP                                  |

## 每个任务的统一验证

```bash
npm run guard    # 必须全部通过
```

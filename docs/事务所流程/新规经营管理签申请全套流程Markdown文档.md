# 投资经营签证流程系统设计输入文档

## 文档说明

- 本文档用于指导SaaS系统开发“投资经营签证申请流程模块”
- 适用于：新规申请（COE申请）
- 流程模型：状态机（State Machine）
- 本文档包含：案件流程、状态流转、核心字段、提醒机制、扩展预留
## 核心流程状态定义（State Machine）

## 状态说明（State Definition）

| 状态 | 说明 |
| --- | --- |
| `CONSULTING` | 咨询阶段 |
| `CONTRACTED` | 已签约 |
| `WAITING_MATERIAL` | 等待客户提交资料 |
| `MATERIAL_PREPARING` | 内部制作资料中 |
| `REVIEWING` | 内部/客户确认中 |
| `APPLYING` | 已提交入管 |
| `UNDER_REVIEW` | 入管审查中 |
| `NEED_SUPPLEMENT` | 入管要求补资料 |
| `SUPPLEMENT_PROCESSING` | 补资料处理中 |
| `APPROVED` | 下签（COE） |
| `REJECTED` | 入管拒签 |
| `WAITING_PAYMENT` | 待收尾款 |
| `COE_SENT` | 已发送COE |
| `VISA_APPLYING` | 客户海外返签中 |
| `SUCCESS` | 客户已成功入境 |
| `VISA_REJECTED` | 海外返签拒签 |
| `RESIDENCE_PERIOD_RECORDED` | 已记录新在留有效期间 |
| `RENEWAL_REMINDER_SCHEDULED` | 已设置到期提醒 |
| `CLOSED_SUCCESS` | 成功结案 |
| `CLOSED_FAILED` | 失败结案 |

## 流程节点定义（Process Steps）

### 咨询阶段

#### Step 1：创建客户
**输入**
- 客户咨询
**输出**
- 客户记录
#### Step 2：基础信息收集
**字段**
- location（海外 / 日本）
- source_type（介绍 / 广告 / 自然）
- referrer_name（可选）
#### Step 3：发送问卷
**问卷名称**
- 《2025M_C经管签信息表》
**状态**
- CONSULTING
#### Step 4：问卷回收 + 报价
**输入**
- 问卷数据
**输出**
- quote_price（客制化）
- visa_plan（1年 / 4+1年）
#### Step 5：签约
**行为**
- 合同签署
- 收取 deposit_amount（约50%）
**状态变更**
- CONSULTING → CONTRACTED
#### Step 6：发送资料清单
**输入**
- visa_plan
**输出**
- material_list_id
**状态**
- CONTRACTED → WAITING_MATERIAL

### 签约后处理阶段

#### Step 7：客户提交资料
**输入**
- 客户资料
**条件**
- 材料齐全
**状态变更**
- WAITING_MATERIAL → MATERIAL_PREPARING
#### Step 8：内部资料制作
**执行角色**
- 事务职
**输出**
- base_documents
#### Step 9：行政书士处理
**行为**
- 完整资料制作
- 理由书撰写
```text
IF 需要补资料:
→ 状态维持在 MATERIAL_PREPARING 或返回资料补充流程
```

#### Step 10：确认流程
- 内部确认
- 客户确认
**状态**
- MATERIAL_PREPARING → REVIEWING
#### Step 11：最终确认
- 负责人审核
#### Step 12：提交入管
**输出**
- application_id
**状态变更**
- REVIEWING → APPLYING → UNDER_REVIEW

### 入管审查阶段

#### Step 13：接收入管反馈
**输入**
- immigration_result
**枚举值**
```json
[
"APPROVED",
"REJECTED",
"NEED_SUPPLEMENT"
]
```

- **Case 1：APPROVED**
**状态**
- UNDER_REVIEW → APPROVED
- **Case 2：REJECTED**
**状态**
- UNDER_REVIEW → REJECTED → CLOSED_FAILED
- **Case 3：NEED_SUPPLEMENT**

#### Step 14：补资料流程
**行为**
- 收集补充资料
- 行政书士重新提交
**状态流转**
- UNDER_REVIEW → NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING → UNDER_REVIEW
**补资料循环结束后，只允许进入**
- APPROVED
- REJECTED
### 下签后流程

#### Step 15：收取尾款
**状态**
- APPROVED → WAITING_PAYMENT
#### Step 16：发送COE
**输出**
- coe_pdf
**状态**
- WAITING_PAYMENT → COE_SENT
#### Step 17：客户返签
**状态**
- COE_SENT → VISA_APPLYING
#### Step 18：返签结果
**枚举值**
```json
[
"SUCCESS",
"VISA_REJECTED"
]
```

- **Case 1：SUCCESS**
**状态**
- VISA_APPLYING → SUCCESS
- **Case 2：VISA_REJECTED**
**状态**
- VISA_APPLYING → VISA_REJECTED → CLOSED_FAILED
### 入境成功后的在留期间管理

#### Step 19：记录新在留有效期间
**触发条件**
- 客户返签成功并完成入境
**行为**
- 系统记录该客户新的在留期间信息
**建议字段**
- residence_status
- residence_period_start_date
- residence_period_end_date
- residence_years
- residence_card_number（可选）
- entry_date
**状态变更**
- SUCCESS → RESIDENCE_PERIOD_RECORDED
#### Step 20：设置到期前提醒
**触发条件**
- 已记录有效期间结束日
**行为**
- 系统自动创建到期提醒任务
- 在到期日前固定时间点通知公司内部人员或对应负责人
**建议提醒时间**
- 到期前180天
- 到期前90天
- 到期前30天
**状态变更**
- RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED → CLOSED_SUCCESS

## 数据结构定义（核心字段）

### 客户信息（Customer）

```json
{
"customer_id": "",
"name": "",
"location": "OVERSEAS | JAPAN",
"source_type": "REFERRAL | WEB | ADS",
"referrer_name": "",
"visa_type": "BUSINESS_MANAGER"
}
```

### 问卷数据（Survey）

```json
{
"survey_id": "",
"customer_id": "",
"personal_info": {},
"education": {},
"work_experience": {},
"financial_info": {},
"visa_history": {},
"business_plan": {},
"family_info": {}
}
```

### 案件（Case）

```json
{
"case_id": "",
"customer_id": "",
"status": "",
"visa_plan": "1YEAR | 4PLUS1",
"quote_price": 0,
"deposit_paid": false,
"final_payment_paid": false,
"supplement_count": 0
}
```

### 入管结果（Immigration Result）

```json
{
"case_id": "",
"result": "APPROVED | REJECTED | NEED_SUPPLEMENT",
"supplement_count": 0
}
```

### 在留期间信息（Residence Period）

```json
{
"customer_id": "",
"case_id": "",
"residence_status": "BUSINESS_MANAGER",
"residence_period_start_date": "",
"residence_period_end_date": "",
"residence_years": 0,
"entry_date": "",
"residence_card_number": "",
"reminder_scheduled": true
}
```

### 续签提醒任务（Renewal Reminder Task）

```json
{
"reminder_id": "",
"customer_id": "",
"case_id": "",
"reminder_type": "RESIDENCE_EXPIRY",
"target_date": "",
"days_before_expiry": 180,
"status": "PENDING | SENT | DONE",
"assignee": ""
}
```

## 核心业务规则（Business Rules）

### 补资料规则

- 补资料流程可循环多次
- 每次补资料必须记录次数
### 收款规则

- 签约时收取定金（约50%）
- 下签后必须收尾款才可发送COE
### 结果收敛规则

**所有流程最终必须进入**
- CLOSED_SUCCESS
- CLOSED_FAILED
### 拒签规则

- 入管拒签 → 部分退款
- 系统仅标记状态，具体退款金额按合同执行
### 海外拒签规则

- 海外返签被拒 → 不退款
**状态进入**
- CLOSED_FAILED
### 在留期间记录规则

- 客户成功入境后，必须补录或确认新的在留有效期间
- 未记录有效期间，不允许自动完结为 CLOSED_SUCCESS
### 到期提醒规则

- 只要存在有效的在留到期日，系统必须自动生成续签提醒任务
**提醒时间点应可配置，默认建议**
- 180天前
- 90天前
- 30天前
### 提醒失败兜底规则

- 若提醒任务创建失败，案件不得自动进入 CLOSED_SUCCESS
- 应进入人工待处理队列或异常状态
## 扩展预留（为后续签证类型准备）

```json
{
"visa_type": "BUSINESS_MANAGER | ENGINEER | DEPENDENT"
}
```

## 研发实现建议

### 建议拆分模块

- 客户管理模块
- 案件管理模块
- 问卷管理模块
- 材料管理模块
- 审查结果管理模块
- 在留期间管理模块
- 提醒任务模块
### 建议事件触发点

- CASE_APPROVED
- FINAL_PAYMENT_CONFIRMED
- COE_SENT
- VISA_SUCCESS
- RESIDENCE_PERIOD_RECORDED
- RENEWAL_REMINDER_CREATED
### 建议可配置项

- 提醒提前天数
- 不同签证类型对应的提醒模板
- 指派负责人规则
- 结案条件

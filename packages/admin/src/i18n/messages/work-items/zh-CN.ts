const dashboardWorkItems = {
  mine: {
    todo: {
      uploadReceipt: {
        title: "上传李美玲家族滞在补件回执",
        meta: {
          caseId: "CASE-2409",
          owner: "负责人：陈静",
          time: "今天 11:00",
        },
        desc: "回执上传后即可解除待补件状态，并通知主办人继续复核。",
        statusLabel: "今日必须处理",
        action: "上传回执",
      },
      chaseVisaDocs: {
        title: "跟进佐藤健签证变更资料催办",
        meta: {
          caseId: "CASE-2416",
          owner: "协作：助理 A",
          time: "今天 14:30",
        },
        desc: "客户仍缺在职证明与住民票，建议先创建催办任务并发送提醒。",
        statusLabel: "催办中",
        action: "创建催办",
      },
      billingReceipt: {
        title: "确认高桥优收费凭证是否到账",
        meta: {
          caseId: "CASE-2398",
          owner: "收费节点",
          time: "今天 17:00",
        },
        desc: "若仍未到账，需要在待回款列表中登记催款任务。",
        statusLabel: "影响回款",
        action: "登记回款",
      },
    },
    deadlines: {
      wangRenewal: {
        title: "王欣 技人国更新",
        meta: {
          caseId: "CASE-2421",
          owner: "负责人：陈静",
          due: "截止：4/12",
        },
        desc: "距离提交期限还有 3 天，资料已齐，建议尽快进入校验与提交。",
        statusLabel: "3 天内到期",
        action: "创建跟进",
      },
      zhangFamilyRenewal: {
        title: "张宁 家族滞在更新",
        meta: {
          caseId: "CASE-2411",
          owner: "负责人：陈静",
          due: "截止：4/16",
        },
        desc: "补件材料已收齐，需复核主申请人与关联人资料一致性。",
        statusLabel: "7 天内到期",
        action: "查看案件",
      },
      yamadaPermanent: {
        title: "山田翔 永住申请",
        meta: {
          caseId: "CASE-2389",
          owner: "负责人：陈静",
          due: "截止：4/28",
        },
        desc: "最近一个月内需要提前准备审查表和费用说明。",
        statusLabel: "未来一个月",
        action: "创建跟进",
      },
    },
    submissions: {
      wangSubmit: {
        title: "王欣 技人国更新",
        meta: {
          caseId: "CASE-2421",
          ready: "资料已齐",
          blocker: "阻断项：0",
        },
        desc: "材料完整，可直接进入提交流程并生成提交包。",
        statusLabel: "可提交",
        action: "进入提交",
      },
      zhangSubmit: {
        title: "张宁 家族滞在更新",
        meta: {
          caseId: "CASE-2411",
          ready: "资料已齐",
          blocker: "待复核：配偶资料",
        },
        desc: "如启用复核流程，可先分派复核人再执行提交。",
        statusLabel: "可提交",
        action: "生成提交包",
      },
    },
    risks: {
      takaRenewalRisk: {
        title: "高桥优高度人才更新",
        meta: {
          caseId: "CASE-2398",
          risk: "欠款风险",
          amount: "未收金额：JPY 180,000",
        },
        desc: "收费节点已到但仍未结清，需登记催款并暂停非必要推进。",
        statusLabel: "高风险",
        action: "登记回款",
      },
      liCorrectionRisk: {
        title: "李美玲家族滞在补正",
        meta: {
          caseId: "CASE-2409",
          blocker: "阻断项：1",
          due: "截止：4/15",
        },
        desc: "补正材料缺失会阻断提交，需要立即定位到资料清单。",
        statusLabel: "硬阻断",
        action: "定位阻断项",
      },
    },
  },
  group: {
    todo: {
      groupTodoOverview: {
        title: "东京一组今日待办总览",
        meta: {
          count: "14 项动作",
          owners: "主办人：3 人",
          priority: "需优先清零今日任务",
        },
        desc: "本组今日任务量偏高，建议先清空补件回执与截止前催办。",
        statusLabel: "组内概览",
        action: "批量完成",
      },
      submissionReview: {
        title: "待提交案件集中复核",
        meta: {
          count: "5 个案件",
          owners: "2 个主办人",
          time: "今天内安排复核",
        },
        desc: "适合统一分配复核时间段，避免案件集中临近截止。",
        statusLabel: "待安排",
        action: "进入提交",
      },
    },
    deadlines: {
      groupUrgentDue: {
        title: "东京一组 3 天内到期案件",
        meta: {
          count: "2 个案件",
          cases: "CASE-2421 / CASE-2430",
          owners: "负责人：陈静 / 小林",
        },
        desc: "需立即建立跟进任务，保证提交材料与回执同步。",
        statusLabel: "高优先级",
        action: "批量跟进",
      },
      groupWeekDue: {
        title: "本组最近 7 天到期案件",
        meta: {
          count: "6 个案件",
          types: "含家族滞在 / 技人国",
          stage: "多为补件收口阶段",
        },
        desc: "建议今天完成责任人确认与补件催办。",
        statusLabel: "最近 7 天",
        action: "创建任务",
      },
      groupMonthDue: {
        title: "本组未来一个月到期案件",
        meta: {
          count: "额外 4 个案件",
          schedule: "需提前排期",
          types: "含永住申请",
        },
        desc: "切到一个月视图后，可以更早安排后续排期。",
        statusLabel: "未来一个月",
        action: "查看案件",
      },
    },
    submissions: {
      groupSubmissions: {
        title: "本组待提交案件",
        meta: {
          count: "5 个案件",
          ready: "可继续提交",
          review: "建议统一复核",
        },
        desc: "可按模板分批生成提交包，减少重复操作。",
        statusLabel: "可批量推进",
        action: "生成提交包",
      },
    },
    risks: {
      groupRisks: {
        title: "东京一组风险案件",
        meta: {
          count: "4 个案件",
          blockers: "硬阻断 2 个",
          billing: "欠款风险 2 个",
        },
        desc: "建议先给每个案件指派明确责任人，再拆分任务。",
        statusLabel: "需指派责任人",
        action: "批量指派",
      },
    },
  },
  all: {
    todo: {
      firmTodoOverview: {
        title: "全所今日待办总量",
        meta: {
          count: "41 项动作",
          groups: "覆盖 5 个组",
          scope: "全所视角",
        },
        desc: "适合用于登录首页快速识别今天最紧急的工作量分布。",
        statusLabel: "全所总览",
        action: "查看任务",
      },
    },
    deadlines: {
      firmWeekDue: {
        title: "全所 7 天内临期案件",
        meta: {
          count: "19 个案件",
          groups: "3 个组集中",
          schedule: "需统一排期",
        },
        desc: "适合先识别临期压力，再进入案件列表继续安排。",
        statusLabel: "全所临期",
        action: "创建跟进",
      },
      firmMonthDue: {
        title: "全所未来一个月到期案件",
        meta: {
          count: "额外 11 个案件",
          schedule: "长期排期提醒",
          priority: "建议提前安排",
        },
        desc: "用于提前识别未来一个月内即将进入补件或提交阶段的案件。",
        statusLabel: "未来一个月",
        action: "查看案件",
      },
    },
    submissions: {
      firmSubmissions: {
        title: "全所待提交案件",
        meta: {
          count: "10 个案件",
          groups: "可按组分批推进",
          review: "建议统一复核时段",
        },
        desc: "可结合案件列表进一步筛选负责人和阶段。",
        statusLabel: "全所待提交",
        action: "进入提交",
      },
    },
    risks: {
      firmRisks: {
        title: "全所风险案件",
        meta: {
          count: "9 个案件",
          highRisk: "高风险 4 个",
          mix: "含欠款与阻断叠加",
        },
        desc: "建议先按类型拆分成阻断修复、补正临期和回款催收三类动作。",
        statusLabel: "管理重点",
        action: "定位阻断项",
      },
    },
  },
} as const;

export default dashboardWorkItems;

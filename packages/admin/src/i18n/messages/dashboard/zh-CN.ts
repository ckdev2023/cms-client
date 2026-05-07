import dashboardWorkItems from "../work-items/zh-CN";
import dashboardWorkItem from "../dashboard-work-item/zh-CN";

const dashboard = {
  hero: {
    kicker: "Dashboard",
    title: "早上好，{name} · {role}",
    role: "主办人",
    subtitle: "今天先处理：今日待办、已逾期 / 即将到期、待提交与风险案件。",
  },
  filters: {
    scopeLabel: "查看范围",
    groupLabel: "组过滤",
  },
  scope: {
    mine: "我的",
    group: "本组",
    all: "全所",
    groupNotMember: "您未加入任何分组，无法查看本组数据",
  },
  scopeSummary: {
    mine: "当前显示我负责或参与的案件与任务，卡片和列表会一起更新。",
    group: "当前显示本组的案件与任务，方便一起安排今日优先级与期限压力。",
    all: "当前显示全所范围，适合快速查看待办、期限、待提交与风险分布。",
  },
  state: {
    loading: "正在加载仪表盘数据…",
    refreshing: "正在刷新仪表盘数据…",
    unauthorized: "当前登录态无法访问仪表盘，请重新登录后重试。",
    requestFailed: "仪表盘数据加载失败，请稍后重试。",
    noGroupAccess: "您未加入任何分组，无法查看本组数据。",
    retry: "重新加载",
  },
  quickActions: {
    title: "快捷动作",
    subtitle: "优先把\u201C下一步动作\u201D做成可点、可追踪。",
    viewMyTasks: "查看我的待办",
    timeRange: "时间范围",
    dayUnit: "{count} 天",
    cards: {
      createLead: {
        title: "新建咨询线索",
        desc: "先承接咨询，再转客户/案件",
      },
      createCustomer: {
        title: "新建客户",
        desc: "快速录入个人客户基础信息",
      },
      createCase: {
        title: "新建案件",
        desc: "按模板自动生成资料清单",
      },
      dueSoon: {
        title: "去催办 / 到期",
        desc: "聚合缺件、补正与期限",
      },
    },
    inlineActions: {
      createFollowUp: "一键创建跟进任务",
      completeToday: "批量完成今日待办",
      goSubmit: "进入校验与提交",
      addReceipt: "登记回款 / 上传凭证",
    },
  },
  summary: {
    cards: {
      todayTasks: {
        label: "今日待办",
        statusLabel: "核心动作",
        helper: "今日必须处理的任务、跟进与催办。",
        meta: "今日需要处理",
        action: "批量完成",
      },
      upcomingCases: {
        label: "已逾期 / 即将到期",
        statusLabel: "先处理期限",
        helper: "先清掉已逾期案件，再安排最近 7 / 30 天内要到期的案件。",
        meta: "按期限窗口统计",
        action: "查看临期案件",
      },
      pendingSubmissions: {
        label: "待提交案件",
        statusLabel: "可继续提交",
        helper: "资料和校验已通过，可继续复核与提交。",
        meta: "等待提交",
        action: "进入提交",
      },
      riskCases: {
        label: "风险案件",
        statusLabel: "优先处理",
        helper: "先修必须处理的问题：阻断、补正临期、缺件与欠款风险。",
        meta: "卡点待修复",
        action: "去修复风险项",
      },
    },
  },
  panels: {
    todayTodo: {
      tag: "Top Priority",
      title: "今日待办",
      subtitle: "先处理今天必须完成的催办、回执上传、补件与收费确认。",
      action: "批量完成",
      emptyMessage: "暂无今日待办，去查看全部案件继续排期。",
      items: {
        missingDocs: "经营管理签 4 个月认定证明，今天 15:00 前回传补件。",
        receiptUpload: "客户 A 的在留资格认定书已到馆，等待上传回执。",
        billingReview: "案件 B 的收费确认待主办复核，避免晚间对账遗漏。",
      },
    },
    deadlines: {
      tag: "Deadlines",
      title: "已逾期 / 即将到期",
      subtitle: "先清逾期，再看最近 7 / 30 天内需要安排的案件。",
      action: "查看临期案件",
      emptyMessage:
        "当前窗口内暂无逾期或临期案件，可切换到 30 天视图继续查看。",
      items: {
        overdueCases: "2 件案件已逾期未提交，优先检查资料缺口与风险确认。",
        upcomingCases: "未来 7 天内有 5 件案件需要预约递交或补件。",
      },
    },
    pendingSubmission: {
      tag: "Submission",
      title: "待提交案件",
      subtitle: "适合集中处理复核、提交和回执上传。",
      action: "进入校验与提交",
      emptyMessage: "暂无待提交案件，可回到案件列表继续推进前置步骤。",
      items: {
        businessManager: "株式会社设立后的经营管理签首签资料已齐备。",
        engineerRenewal: "技人国更新案件已完成费用确认，可进入最终复核。",
      },
    },
    risks: {
      tag: "Risks",
      title: "风险案件",
      subtitle: "把会卡住推进的问题集中出来，修完再继续提交。",
      action: "去修复风险项",
      emptyMessage: "当前视角暂无风险案件，继续关注期限与待提交节奏。",
      items: {
        fundSource: "经营管理签资金来源说明不完整，需要补充汇款链路。",
        contractVersion: "客户 C 的雇佣合同版本不一致，需确认最终签署稿。",
      },
    },
  },
  visibility: {
    current: {
      label: "权限与可见性",
      title: "当前视角说明",
      notes: {
        mine: {
          note1:
            "主办人 / 助理默认进入\u201C我的\u201D，聚焦自己负责或协作案件。",
          note2: "首页固定聚焦今日待办、已逾期 / 即将到期、待提交与风险案件。",
          note3: "适合先处理今天必须完成的动作，再继续跟进临期和卡点案件。",
        },
        group: {
          note1: "本组视角适用于主办人、助理查看团队待办、期限压力与提交节奏。",
          note2: "适合批量创建跟进任务、分派责任人、推进提交前复核与卡点修复。",
          note3: "切换视角时卡片计数与列表同步刷新，保留固定卡片布局。",
        },
        all: {
          note1:
            "全所视角仅管理员可见，用于观察全所待办、期限、待提交和风险压力。",
          note2: "适合组长或管理员快速查看整体进度与需要先处理的问题。",
          note3: "如需更深入处理，可进入案件列表继续筛选和跟进。",
        },
      },
    },
    tips: {
      label: "补充说明",
      title: "使用提示",
      items: {
        tip1: "卡片计数为 0 时仍保留卡片，不做隐藏。",
        tip2: "切换范围与窗口时会先展示骨架屏，再同步刷新卡片与列表。",
        tip3: "这里优先展示最需要处理的 4 类工作，帮助你快速安排今天要先做什么。",
        tip4: "如需继续深入处理资料、收费或案件细节，可从对应入口进入下一步。",
      },
    },
  },
  workItems: dashboardWorkItems,
  workItem: dashboardWorkItem,
} as const;

export default dashboard;

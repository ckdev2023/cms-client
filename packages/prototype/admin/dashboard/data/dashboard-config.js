(function () {
  var dashboardConfig = {
    defaultScope: "mine",
    defaultWindow: 7,
    cards: [
      "todayTasks",
      "upcomingCases",
      "pendingDocuments",
      "pendingSubmissions",
      "inReview",
      "pendingBilling",
      "riskCases",
    ],
    scopeLabels: {
      mine: "我的视角",
      group: "本组视角",
      all: "全所视角",
    },
    scopeSummary: {
      mine: "当前显示我负责或参与的案件与任务，卡片和列表会一起更新。",
      group: "当前显示本组的案件与任务，方便一起安排优先级。",
      all: "当前显示全所范围，适合查看整体进度与风险分布。",
    },
    visibilityNotes: {
      mine: [
        "主办人 / 助理默认进入“我的”，聚焦自己负责或协作案件。",
        "今日待办、待补件、风险案件与待回款列表会同步收敛到个人范围。",
        "适合先处理今天必须完成的动作，再继续跟进临期案件。",
      ],
      group: [
        "本组视角适用于主办人、助理查看团队待办、临期案件和补件压力。",
        "适合批量创建跟进任务、分派责任人、推进提交前复核。",
        "切换视角时卡片计数与列表同步刷新，保留固定卡片布局。",
      ],
      all: [
        "全所视角仅管理员可见，用于观察全所待办、待提交、风险和回款风险。",
        "适合组长或管理员快速查看整体进度、风险和回款情况。",
        "如需更深入处理，可进入案件列表继续筛选和跟进。",
      ],
    },
    metrics: {
      mine: {
        todayTasks: { value: "6", helper: "今天有 2 项催办、2 项回执上传、2 项补件确认。", meta: "今日需要处理" },
        upcomingCases: {
          valueByWindow: { 7: "3", 30: "6" },
          helperByWindow: {
            7: "最近 7 天内有 3 个关键期限需要优先跟进。",
            30: "切到最近 30 天后，会多看到 3 个需要提前安排的案件。",
          },
          meta: "按截止日统计"
        },
        pendingDocuments: { value: "2", helper: "1 个退回补正，1 个资料项缺件。", meta: "缺件或补正中" },
        pendingSubmissions: { value: "2", helper: "资料和校验已通过，可继续复核与提交。", meta: "等待提交" },
        inReview: { value: "4", helper: "等待入管结果与回执，重点关注补正临期。", meta: "提交后跟进" },
        pendingBilling: { value: "1", helper: "有 1 笔已到收费节点但仍未结清。", meta: "待确认到账" },
        riskCases: { value: "2", helper: "1 个阻断项，1 个欠款风险。", meta: "阻断、逾期或欠款" },
      },
      group: {
        todayTasks: { value: "14", helper: "本组今日需处理 14 项任务，含催办、补件、回执上传。", meta: "今日需要处理" },
        upcomingCases: {
          valueByWindow: { 7: "8", 30: "12" },
          helperByWindow: {
            7: "本组最近 7 天内已有 8 个案件需要排期。",
            30: "切到最近 30 天后可提前看到更多排期压力。",
          },
          meta: "按截止日统计"
        },
        pendingDocuments: { value: "5", helper: "3 个缺件、2 个补正中。", meta: "缺件或补正中" },
        pendingSubmissions: { value: "5", helper: "待提交案件较集中，适合统一复核。", meta: "等待提交" },
        inReview: { value: "9", helper: "审理中案件较多，需持续跟进入管回执。", meta: "提交后跟进" },
        pendingBilling: { value: "3", helper: "有 3 个收费节点已到，建议与财务同步。", meta: "待确认到账" },
        riskCases: { value: "4", helper: "阻断项与欠款风险同时存在，需尽快指派责任人。", meta: "阻断、逾期或欠款" },
      },
      all: {
        todayTasks: { value: "41", helper: "全所今日待办量较高，需重点关注风险与回款。", meta: "今日需要处理" },
        upcomingCases: {
          valueByWindow: { 7: "19", 30: "30" },
          helperByWindow: {
            7: "全所最近 7 天内已有 19 个案件临期。",
            30: "切到最近 30 天后，会继续放大排期与跟进压力。",
          },
          meta: "按截止日统计"
        },
        pendingDocuments: { value: "12", helper: "待补件案件分散在多个组，需要统一跟催。", meta: "缺件或补正中" },
        pendingSubmissions: { value: "10", helper: "可安排统一复核节奏，避免临近截止时集中处理。", meta: "等待提交" },
        inReview: { value: "21", helper: "审理中案件覆盖多个模板，需集中追踪回执。", meta: "提交后跟进" },
        pendingBilling: { value: "7", helper: "回款风险集中在 3 个高金额案件。", meta: "待确认到账" },
        riskCases: { value: "9", helper: "阻断、补正临期与欠款风险叠加。", meta: "阻断、逾期或欠款" },
      },
    },
    lists: {
      mine: {
        todo: [
          {
            title: "上传李美玲家族滞在补件回执",
            meta: ["CASE-2409", "负责人：陈静", "今天 11:00"],
            desc: "回执上传后即可解除“待补件”状态，并通知主办人继续复核。",
            status: "status-info",
            statusLabel: "今日必须处理",
            action: "上传回执",
          },
          {
            title: "跟进佐藤健签证变更资料催办",
            meta: ["CASE-2416", "协作：助理 A", "今天 14:30"],
            desc: "客户仍缺在职证明与住民票，建议先创建催办任务并发送提醒。",
            status: "status-warn",
            statusLabel: "催办中",
            action: "创建催办",
          },
          {
            title: "确认高桥优收费凭证是否到账",
            meta: ["CASE-2398", "收费节点", "今天 17:00"],
            desc: "若仍未到账，需要在待回款列表中登记催款任务。",
            status: "status-danger",
            statusLabel: "影响回款",
            action: "登记回款",
          },
        ],
        deadlines: [
          {
            title: "王欣 技人国更新",
            meta: ["CASE-2421", "负责人：陈静", "截止：4/12"],
            desc: "距离提交期限还有 3 天，资料已齐，建议尽快进入校验与提交。",
            status: "status-warn",
            statusLabel: "3 天内到期",
            action: "创建跟进",
            daysLeft: 3,
          },
          {
            title: "张宁 家族滞在更新",
            meta: ["CASE-2411", "负责人：陈静", "截止：4/16"],
            desc: "补件材料已收齐，需复核主申请人与关联人资料一致性。",
            status: "status-info",
            statusLabel: "7 天内到期",
            action: "查看案件",
            daysLeft: 7,
          },
          {
            title: "山田翔 永住申请",
            meta: ["CASE-2389", "负责人：陈静", "截止：4/28"],
            desc: "最近一个月内需要提前准备审查表和费用说明。",
            status: "status-muted",
            statusLabel: "未来一个月",
            action: "创建跟进",
            daysLeft: 19,
          },
        ],
        documents: [
          {
            title: "佐藤健签证变更",
            meta: ["CASE-2416", "缺件：在职证明 / 住民票", "负责人：陈静"],
            desc: "客户已读未回，建议一键生成补件催办任务并同步到今日待办。",
            status: "status-warn",
            statusLabel: "缺件",
            action: "定位缺件",
          },
          {
            title: "李美玲家族滞在补正",
            meta: ["CASE-2409", "退回补正", "截止：4/15"],
            desc: "需补交婚姻关系证明与收入证明，优先上传回执。",
            status: "status-danger",
            statusLabel: "补正临期",
            action: "进入资料清单",
          },
        ],
        submissions: [
          {
            title: "王欣 技人国更新",
            meta: ["CASE-2421", "资料已齐", "阻断项：0"],
            desc: "材料完整，可直接进入提交流程并生成提交包。",
            status: "status-info",
            statusLabel: "可提交",
            action: "进入提交",
          },
          {
            title: "张宁 家族滞在更新",
            meta: ["CASE-2411", "资料已齐", "待复核：配偶资料"],
            desc: "如启用复核流程，可先分派复核人再执行提交。",
            status: "status-info",
            statusLabel: "可提交",
            action: "生成提交包",
          },
        ],
        risks: [
          {
            title: "高桥优经营管理更新",
            meta: ["CASE-2398", "欠款风险", "未收金额：JPY 180,000"],
            desc: "收费节点已到但仍未结清，需登记催款并暂停非必要推进。",
            status: "status-danger",
            statusLabel: "高风险",
            action: "登记回款",
          },
          {
            title: "李美玲家族滞在补正",
            meta: ["CASE-2409", "阻断项：1", "截止：4/15"],
            desc: "补正材料缺失会阻断提交，需要立即定位到资料清单。",
            status: "status-danger",
            statusLabel: "硬阻断",
            action: "定位阻断项",
          },
        ],
        billing: [
          {
            title: "高桥优经营管理更新",
            meta: ["CASE-2398", "应回款：JPY 180,000", "到期：4/09"],
            desc: "优先登记回款；如仍未到账，创建催款任务并通知财务。",
            status: "status-warn",
            statusLabel: "待回款",
            action: "上传凭证",
          },
        ],
      },
      group: {
        todo: [
          {
            title: "东京一组今日待办总览",
            meta: ["14 项动作", "主办人：3 人", "需优先清零今日任务"],
            desc: "本组今日任务量偏高，建议先清空补件回执与截止前催办。",
            status: "status-info",
            statusLabel: "组内概览",
            action: "批量完成",
          },
          {
            title: "待提交案件集中复核",
            meta: ["5 个案件", "2 个主办人", "今天内安排复核"],
            desc: "适合统一分配复核时间段，避免案件集中临近截止。",
            status: "status-warn",
            statusLabel: "待安排",
            action: "进入提交",
          },
        ],
        deadlines: [
          {
            title: "东京一组 3 天内到期案件",
            meta: ["2 个案件", "CASE-2421 / CASE-2430", "负责人：陈静 / 小林"],
            desc: "需立即建立跟进任务，保证提交材料与回执同步。",
            status: "status-danger",
            statusLabel: "高优先级",
            action: "批量跟进",
            daysLeft: 3,
          },
          {
            title: "本组最近 7 天到期案件",
            meta: ["6 个案件", "含家族滞在 / 技人国", "多为补件收口阶段"],
            desc: "建议今天完成责任人确认与补件催办。",
            status: "status-warn",
            statusLabel: "最近 7 天",
            action: "创建任务",
            daysLeft: 7,
          },
          {
            title: "本组未来一个月到期案件",
            meta: ["额外 4 个案件", "需提前排期", "含永住申请"],
            desc: "切到一个月视图后，可以更早安排后续排期。",
            status: "status-muted",
            statusLabel: "未来一个月",
            action: "查看案件",
            daysLeft: 24,
          },
        ],
        documents: [
          {
            title: "本组待补件汇总",
            meta: ["5 个案件", "3 个缺件", "2 个补正中"],
            desc: "适合组内晨会先按资料缺口统一催办。",
            status: "status-warn",
            statusLabel: "组内待补件",
            action: "进入资料清单",
          },
        ],
        submissions: [
          {
            title: "本组待提交案件",
            meta: ["5 个案件", "可继续提交", "建议统一复核"],
            desc: "可按模板分批生成提交包，减少重复操作。",
            status: "status-info",
            statusLabel: "可批量推进",
            action: "生成提交包",
          },
        ],
        risks: [
          {
            title: "东京一组风险案件",
            meta: ["4 个案件", "硬阻断 2 个", "欠款风险 2 个"],
            desc: "建议先给每个案件指派明确责任人，再拆分任务。",
            status: "status-danger",
            statusLabel: "需指派责任人",
            action: "批量指派",
          },
        ],
        billing: [
          {
            title: "本组待回款案件",
            meta: ["3 个案件", "合计 JPY 460,000", "到期节点已到"],
            desc: "财务与主办人需要同步确认到账状态与凭证上传。",
            status: "status-warn",
            statusLabel: "组内回款风险",
            action: "登记回款",
          },
        ],
      },
      all: {
        todo: [
          {
            title: "全所今日待办总量",
            meta: ["41 项动作", "覆盖 5 个组", "全所视角"],
            desc: "适合用于登录首页快速识别今天最紧急的工作量分布。",
            status: "status-info",
            statusLabel: "全所总览",
            action: "查看任务",
          },
        ],
        deadlines: [
          {
            title: "全所 7 天内临期案件",
            meta: ["19 个案件", "3 个组集中", "需统一排期"],
            desc: "适合先识别临期压力，再进入案件列表继续安排。",
            status: "status-danger",
            statusLabel: "全所临期",
            action: "创建跟进",
            daysLeft: 5,
          },
          {
            title: "全所未来一个月到期案件",
            meta: ["额外 11 个案件", "长期排期提醒", "建议提前安排"],
            desc: "用于提前识别未来一个月内即将进入补件或提交阶段的案件。",
            status: "status-muted",
            statusLabel: "未来一个月",
            action: "查看案件",
            daysLeft: 22,
          },
        ],
        documents: [
          {
            title: "全所待补件总览",
            meta: ["12 个案件", "覆盖多个模板", "含 4 个补正案件"],
            desc: "适合管理员或组长巡检，再进入案件列表继续处理。",
            status: "status-warn",
            statusLabel: "全所补件压力",
            action: "查看补件",
          },
        ],
        submissions: [
          {
            title: "全所待提交案件",
            meta: ["10 个案件", "可按组分批推进", "建议统一复核时段"],
            desc: "可结合案件列表进一步筛选负责人和阶段。",
            status: "status-info",
            statusLabel: "全所待提交",
            action: "进入提交",
          },
        ],
        risks: [
          {
            title: "全所风险案件",
            meta: ["9 个案件", "高风险 4 个", "含欠款与阻断叠加"],
            desc: "建议先按类型拆分成阻断修复、补正临期和回款催收三类动作。",
            status: "status-danger",
            statusLabel: "管理重点",
            action: "定位阻断项",
          },
        ],
        billing: [
          {
            title: "全所待回款案件",
            meta: ["7 个案件", "合计 JPY 1,240,000", "财务重点关注"],
            desc: "适合先确认回款压力，再继续登记回款或跟进财务。",
            status: "status-warn",
            statusLabel: "全所待回款",
            action: "登记回款",
          },
        ],
      },
    },
    toasts: {
      batchComplete: {
        title: "批量完成待办（示例）",
        desc: "已批量处理今日待办。",
      },
      followup: {
        title: "跟进任务已创建（示例）",
        desc: "已为临期案件创建跟进任务。",
      },
      submit: {
        title: "进入校验与提交（示例）",
        desc: "已打开提交相关入口。",
      },
      payment: {
        title: "登记回款（示例）",
        desc: "已打开收费动作入口，可继续上传凭证或创建催款任务。",
      },
      documents: {
        title: "已定位到资料清单（示例）",
        desc: "已定位到相关资料处理入口。",
      },
      risk: {
        title: "风险案件已聚焦（示例）",
        desc: "建议优先处理阻断项，并尽快确认负责人。",
      },
      rowAction: {
        title: "案件动作已触发（示例）",
        desc: "已为你打开对应操作入口。",
      },
    },
  };

  window.DashboardConfig = dashboardConfig;
})();

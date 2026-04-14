import customerDetail from "./customers/zh-CN";
import billing from "./billing/zh-CN";
import leads from "./leads/zh-CN";
import dashboardWorkItems from "./work-items/zh-CN";

const zhCN = {
  shell: {
    topbar: {
      openNavigation: "打开导航",
      globalSearch: "全局搜索",
      searchPlaceholder: "搜索：客户 / 案件 / 资料 / 文书...",
      localeLabel: "界面语言",
      createLead: "新建咨询",
      createCase: "新建案件",
    },
    nav: {
      asideLabel: "侧边栏导航",
      mainLabel: "主导航",
      closeNavigation: "关闭导航",
      brandChip: "事務所管理",
      groups: {
        workspace: "工作台",
        business: "业务",
        content: "内容",
        finance: "财务",
        system: "系统",
      },
      items: {
        dashboard: "仪表盘",
        leads: "咨询与会话",
        customers: "客户",
        cases: "案件",
        tasks: "任务与提醒",
        documents: "资料中心",
        billing: "收费与财务",
        settings: "设置",
      },
    },
  },
  foundation: {
    title: "Foundation",
    subtitle: "Shell + shared UI primitives — 新页面接入时的可视化参照",
    button: "Button",
    buttons: {
      primary: "主要",
      outlined: "描边",
      ghost: "幽灵",
    },
    chip: "Chip",
    chips: {
      default: "默认",
      primary: "Primary",
      success: "成功",
      warning: "警告",
      danger: "危险",
    },
    searchField: "SearchField",
    searchPlaceholder: "搜索示例…",
  },
  sectionPlaceholder: {
    badge: "建设中",
    subtitle: "{section} 页面入口已接入，后续会在这里承接正式业务内容。",
    cardTitle: "页面状态",
    description:
      "当前已为 {section} 注册可访问路由，侧边栏跳转不会再触发未匹配告警；正式模块落地后可直接在此页替换具体实现。",
    pathLabel: "当前路径",
  },
  customers: {
    list: {
      title: "客户",
      subtitle: "管理客户档案、联系方式与关联案件。",
      placeholderMessage: "客户列表即将上线，正在建设中。",
      addCustomer: "添加客户",
      summaryTitle: "客户工作概览",
      summarySubtitle:
        "沿用资料中心的摘要卡片结构，让负责人快速判断手头客户和案件压力。",
      summary: {
        mine: {
          label: "我的客户",
          hint: "当前登录人员名下客户总数，适合先看自己今天要跟进的客户池。",
        },
        group: {
          label: "本组客户",
          hint: "本组全部客户规模，方便组长判断分配、协作和是否需要转派。",
        },
        active: {
          label: "有活跃案件",
          hint: "已经在推进案件的客户数量，适合优先查看执行中客户的近期沟通与补件。",
        },
        noActive: {
          label: "无活跃案件",
          hint: "尚未建案或已办结客户数量，方便事务所集中回访、签约推进和再次转化。",
        },
      },
      scopeLabel: "数据范围",
      scope: {
        mine: "我的",
        group: "本组",
        all: "全所（管理员）",
      },
      searchPlaceholder: "搜索：客户名 / フリガナ / 电话 / 邮箱",
      filters: {
        groupAll: "所属分组：全部",
        ownerAll: "负责人：全部",
        activeCasesAll: "活跃案件：全部",
        activeCasesYes: "有活跃案件",
        activeCasesNo: "无活跃案件",
        reset: "重置",
      },
      filterSummary: "当前查看：{scope} · {count} 位",
      columns: {
        customer: "客户",
        furigana: "フリガナ",
        cases: "案件",
        lastContact: "最近联系",
        owner: "负责人",
        referral: "介绍人/来源",
        group: "所属分组",
        actions: "操作",
      },
      selectAll: "全选客户",
      selectRow: "选择 {name}",
      casesSummary: "累计 {total} · 活跃 {active}",
      bulk: {
        label: "批量操作",
        selected: "已选择 {count} 条",
        clear: "清除",
        assignOwner: "指派负责人",
        selectOwner: "选择负责人",
        changeGroup: "调整分组",
        selectGroup: "选择分组",
        apply: "应用",
      },
      empty: {
        title: "当前筛选没有匹配客户",
        description: "可尝试切换数据范围，或重置搜索条件。",
      },
      pagination: {
        summary: "显示 {start} - {end} 条，共 {total} 条",
        prev: "上一页",
        next: "下一页",
      },
      actions: {
        viewDetail: "打开客户详情",
        createCase: "从该客户开始办案",
      },
      toast: {
        customerCreated: {
          title: "客户已创建（示例）",
          description: "已生成客户档案，可继续建案",
        },
        draftSaved: {
          title: "草稿已保存",
          description: "可在客户列表中点击「继续」完成建档",
        },
        draftLoaded: {
          title: "已载入草稿",
          description: "继续完善后即可完成建档",
        },
        bulkAssign: {
          title: "批量指派（示例）",
          description: "已选择 {count} 条，负责人：{owner}",
        },
        bulkGroup: {
          title: "批量调整分组（示例）",
          description: "已选择 {count} 条，分组：{group}（需留痕）",
        },
      },
      draft: {
        rowLabel: "草稿",
        continue: "继续",
        remove: "删除",
      },
      createModal: {
        title: "新建个人客户",
        description:
          "请填写基础信息完成个人客户建档。电话/邮箱至少填一项用于去重，并保留国籍主数据。",
        fields: {
          displayName: "识别名（对内显示）",
          displayNamePlaceholder: "例如：王伟（就劳）",
          group: "所属 Group",
          groupPlaceholder: "请选择 Group",
          legalName: "姓名（法定）",
          legalNamePlaceholder: "请输入姓名",
          kana: "假名（片假名）",
          kanaPlaceholder: "例如：ワン ウェイ",
          gender: "性別",
          genderDefault: "不限",
          genderMale: "男",
          genderFemale: "女",
          birthDate: "生年月日",
          nationality: "国籍",
          nationalityPlaceholder: "例如：中国 / 日本",
          phone: "电话",
          phonePlaceholder: "手机/座机",
          phoneHint: "电话/邮箱至少填写一项（用于去重与联系）",
          email: "邮箱",
          emailPlaceholder: "邮箱地址",
          referrer: "来源 / 介绍人",
          referrerPlaceholder: "例如：推荐 / 介绍人",
          avatar: "头像",
          note: "备注（可搜索）",
          notePlaceholder: "例如：交接事项、偏好、注意点...",
        },
        dedupe: {
          title: "检测到可能重复的客户",
          description:
            "请确认是否为同一人，避免重复建档。保存前也可先用全局搜索核对。",
        },
        cancel: "取消",
        saveDraft: "保存草稿",
        create: "创建客户",
      },
    },
    detail: customerDetail,
  },
  billing,
  leads,
  dashboard: {
    hero: {
      kicker: "Dashboard",
      title: "早上好，{name} · {role}",
      role: "主办人",
      subtitle: "今天先处理：今日待办、已逾期 / 即将到期、待提交与风险案件。",
    },
    filters: {
      scopeLabel: "查看范围",
      groupLabel: "组过滤",
      groups: {
        all: "全部 Group",
        tokyo1: "东京一组",
        tokyo2: "东京二组",
        osaka: "大阪组",
      },
    },
    scope: {
      mine: "我的",
      group: "本组",
      all: "全所",
    },
    scopeSummary: {
      mine: "当前显示我负责或参与的案件与任务，卡片和列表会一起更新。",
      group: "当前显示本组的案件与任务，方便一起安排今日优先级与期限压力。",
      all: "当前显示全所范围，适合快速查看待办、期限、待提交与风险分布。",
    },
    quickActions: {
      title: "快捷动作",
      subtitle: "优先把“下一步动作”做成可点、可追踪。",
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
            note1: "主办人 / 助理默认进入“我的”，聚焦自己负责或协作案件。",
            note2:
              "首页固定聚焦今日待办、已逾期 / 即将到期、待提交与风险案件。",
            note3: "适合先处理今天必须完成的动作，再继续跟进临期和卡点案件。",
          },
          group: {
            note1:
              "本组视角适用于主办人、助理查看团队待办、期限压力与提交节奏。",
            note2:
              "适合批量创建跟进任务、分派责任人、推进提交前复核与卡点修复。",
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
  },
} as const;

export default zhCN;

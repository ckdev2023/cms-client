const tasksZhCN = {
  workbench: {
    subtitle:
      "把今天要处理的任务和到期、逾期、续签提醒都集中到这里。点仪表盘的「去查看待办」「去修复风险项」入口都会带你来这里。",
    refresh: "刷新",
    reload: "重新加载",
    loading: "加载中…",
    errorTitle: "加载异常",
    placeholder: "—",
    lastUpdated: "最后刷新：{time}",
    notLoaded: "尚未加载",
    panelCount: "显示 {visible} / {total} 条",
    views: {
      pending: {
        title: "待处理任务",
        hint: "把还没开始（待办）和正在做的任务集中查看。",
        panelTitle: "待处理任务",
      },
      today: {
        title: "今日到期",
        hint: "优先清掉今天必须收口的动作。",
        panelTitle: "今日到期任务",
      },
      overdue: {
        title: "已逾期",
        hint: "把已超期的催办与补件先拉出来。",
        panelTitle: "已逾期任务",
      },
      reminders: {
        title: "提醒日志",
        hint: "核对续签提醒是否已生成并进入提醒队列。",
        panelTitle: "提醒日志",
      },
    },
    reminderTable: {
      headerTitle: "提醒内容",
      headerTime: "提醒时间",
      headerStatus: "状态",
      headerMeta: "附加信息",
      empty:
        "当前没有提醒日志。等续签提醒生成后，会在这里显示 180 / 90 / 30 天提醒记录。",
    },
    taskTable: {
      headerTask: "任务",
      headerCase: "案件 / 责任人",
      headerDue: "截止时间",
      headerStatus: "状态",
      headerPriority: "优先级",
      headerActions: "操作",
      unassigned: "未指派",
      complete: "标记完成",
      overdueBadge: "已逾期",
      overdueA11yLabel: "该任务已逾期",
      empty:
        "当前视图没有命中的任务。可以切换到“提醒日志”检查续签提醒是否已经生成。",
    },
    toast: {
      completedTitle: "任务已完成",
      completedDescription: "「{title}」已收口，仪表盘和案件进度会同步更新。",
      completedFallbackTitle: "任务",
      failedTitle: "任务完成失败",
      failedDescription: "操作未生效，请刷新后重试。",
    },
    aside: {
      title: "页面说明",
      copy: "本页直接连接「任务库」和「续签提醒库」，看到的都是事务所里正在进行的真实数据，不是示例。",
      list: {
        item1:
          "上方四张卡片（待处理 / 今日到期 / 已逾期 / 提醒日志）会按任务的状态和截止日期自动分类，不用手工筛选。",
        item2:
          "「提醒日志」可以看到每条续签提醒：应在何时触发、是否已经发送、提醒内容是关于哪个案件、哪位申请人。",
        item3:
          "每条任务右侧点「标记完成」，这条任务就会在全所系统中同步收口，仪表盘待办数量与案件详情页进度都会自动减 1。",
      },
    },
  },
  taskStatus: {
    pending: "待处理",
    in_progress: "处理中",
    completed: "已完成",
    cancelled: "已取消",
  },
  priority: {
    low: "低",
    normal: "普通",
    high: "高",
    urgent: "紧急",
  },
  reminderStatus: {
    pending: "未发送",
    sent: "已发送",
    failed: "发送失败",
    canceled: "已取消",
  },
  reminderTitle: {
    daysBefore: "{visa}到期前 {days} 天提醒",
    daysBeforeNoVisa: "到期前 {days} 天提醒",
    pendingCoeDate: "等待 COE 日期回填的续签提醒",
    fallback: "{type} · {id}",
  },
  reminderMeta: {
    case: "案件 {id}",
    recipient: "接收人 {id}",
    dedupeKey: "去重键 {key}",
    empty: "—",
  },
} as const;

export default tasksZhCN;

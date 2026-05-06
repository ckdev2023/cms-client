const conversationsZhCN = {
  list: {
    title: "会话",
    subtitle: "查看并管理客户会话、消息与分配",
    searchPlaceholder: "搜索：客户名 / 线索名 / 会话内容",
    scopeLabel: "数据范围",
    scope: {
      mine: "我的",
      group: "本组",
      all: "全所（管理员）",
    },
    filters: {
      statusAll: "所有状态",
      statusOpen: "进行中",
      statusClosed: "已关闭",
      ownerAll: "负责人：全部",
      unreadOnly: "仅未读",
      reset: "重置",
    },
    filterSummary: "当前查看：{scope} · {count} 条",
    columns: {
      conversation: "会话",
      lastMessage: "最新消息",
      status: "状态",
      owner: "负责人",
      linkedEntity: "关联对象",
      updated: "最近更新",
    },
    status: {
      open: "进行中",
      closed: "已关闭",
    },
    unread: {
      user: "客户未读",
      staffTenant: "事务所未读",
      staffOwner: "负责人未读",
      badge: "{count} 条未读",
    },
    empty: {
      title: "暂无会话",
      description: "当前筛选条件下没有匹配的会话。",
    },
    pagination: {
      summary: "显示 {start} - {end} 条，共 {total} 条",
      prev: "上一页",
      next: "下一页",
    },
  },
  detail: {
    title: "会话详情",
    assignOwner: "指派负责人",
    reassign: "重新指派",
    close: "关闭会话",
    reopen: "重新开启",
    closedBanner: "该会话已关闭，客户端无法再发送消息。员工仍可查看历史记录。",
    linkedLead: "关联线索",
    linkedCustomer: "关联客户",
    linkedCase: "关联案件",
    noLinkedEntity: "未关联",
    channel: "渠道",
    preferredLanguage: "首选语言",
    ownerPicker: {
      selectLabel: "选择负责人",
      cancel: "取消",
      confirm: "确认",
    },
  },
  messages: {
    inputPlaceholder: "输入消息…",
    send: "发送",
    translationFailed: "翻译失败",
    retryTranslation: "重试翻译",
    forceOriginal: "直接发送原文",
    translationPending: "翻译中…",
    systemEvent: "系统消息",
    kind: {
      text: "文本",
      system_event: "系统事件",
      intake_link: "问卷链接",
      quote_link: "报价链接",
      sign_link: "签约链接",
    },
    visibility: {
      internal_only: "仅内部可见",
      client_visible: "客户可见",
    },
    closedCannotSend: "会话已关闭，无法发送新消息。",
  },
  errors: {
    fetchFailed: "会话加载失败，请稍后重试。",
    sendFailed: "消息发送失败，请稍后重试。",
    assignFailed: "指派失败，请稍后重试。",
    closeFailed: "关闭会话失败，请稍后重试。",
    reopenFailed: "重新开启会话失败，请稍后重试。",
    retryTranslationFailed: "重试翻译失败，请稍后重试。",
  },
  toast: {
    messageSent: {
      title: "消息已发送",
      description: "消息已成功发送",
    },
    assigned: {
      title: "会话已指派",
      description: "已指派给 {owner}",
    },
    closed: {
      title: "会话已关闭",
      description: "客户端将无法再发送新消息",
    },
    reopened: {
      title: "会话已重新开启",
      description: "客户端可以继续发送消息",
    },
    translationRetried: {
      title: "翻译已重新提交",
      description: "消息已重新进入翻译队列",
    },
  },
} as const;

export default conversationsZhCN;

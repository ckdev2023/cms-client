const conversationsJaJP = {
  list: {
    title: "会話",
    subtitle: "顧客との会話・メッセージ・割当を管理",
    searchPlaceholder: "検索：顧客名 / リード名 / 会話内容",
    scopeLabel: "表示範囲",
    scope: {
      mine: "自分",
      group: "グループ",
      all: "全所（管理者）",
    },
    filters: {
      statusAll: "すべてのステータス",
      statusOpen: "オープン",
      statusClosed: "クローズ",
      ownerAll: "すべての担当者",
      unreadOnly: "未読のみ",
      reset: "リセット",
    },
    filterSummary: "表示中：{scope} · {count} 件",
    columns: {
      conversation: "会話",
      lastMessage: "最新メッセージ",
      status: "ステータス",
      owner: "担当者",
      linkedEntity: "関連先",
      updated: "最終更新",
    },
    status: {
      open: "オープン",
      closed: "クローズ",
    },
    unread: {
      user: "顧客未読",
      staffTenant: "事務所未読",
      staffOwner: "担当者未読",
      badge: "未読 {count} 件",
    },
    empty: {
      title: "会話がありません",
      description: "現在のフィルター条件に一致する会話はありません。",
    },
    pagination: {
      summary: "{start}〜{end} 件目（全 {total} 件）",
      prev: "前へ",
      next: "次へ",
    },
  },
  detail: {
    title: "会話詳細",
    assignOwner: "担当者を割当",
    reassign: "再割当",
    close: "会話をクローズ",
    reopen: "再オープン",
    closedBanner:
      "この会話はクローズ済みです。顧客側からのメッセージ送信はブロックされます。スタッフは引き続き閲覧できます。",
    linkedLead: "関連リード",
    linkedCustomer: "関連顧客",
    linkedCase: "関連案件",
    noLinkedEntity: "未関連",
    channel: "チャネル",
    preferredLanguage: "希望言語",
  },
  messages: {
    inputPlaceholder: "メッセージを入力…",
    send: "送信",
    translationFailed: "翻訳に失敗しました",
    retryTranslation: "翻訳を再試行",
    forceOriginal: "原文のまま送信",
    translationPending: "翻訳中…",
    systemEvent: "システムメッセージ",
    kind: {
      text: "テキスト",
      system_event: "システムイベント",
      intake_link: "問診票リンク",
      quote_link: "見積リンク",
      sign_link: "契約リンク",
    },
    visibility: {
      internal_only: "内部のみ",
      client_visible: "顧客公開",
    },
    closedCannotSend:
      "この会話はクローズ済みのため、新しいメッセージを送信できません。",
  },
  errors: {
    fetchFailed:
      "会話の読み込みに失敗しました。しばらくしてから再試行してください。",
    sendFailed:
      "メッセージの送信に失敗しました。しばらくしてから再試行してください。",
    assignFailed: "割当に失敗しました。しばらくしてから再試行してください。",
    closeFailed:
      "会話のクローズに失敗しました。しばらくしてから再試行してください。",
    reopenFailed:
      "会話の再オープンに失敗しました。しばらくしてから再試行してください。",
    retryTranslationFailed:
      "翻訳の再試行に失敗しました。しばらくしてから再試行してください。",
  },
  toast: {
    messageSent: {
      title: "メッセージ送信済み",
      description: "メッセージが正常に送信されました",
    },
    assigned: {
      title: "会話を割当しました",
      description: "{owner} に割当しました",
    },
    closed: {
      title: "会話をクローズしました",
      description: "顧客側からの新規メッセージ送信がブロックされます",
    },
    reopened: {
      title: "会話を再オープンしました",
      description: "顧客側からのメッセージ送信が再度可能になりました",
    },
    translationRetried: {
      title: "翻訳を再送信しました",
      description: "メッセージが翻訳キューに再投入されました",
    },
  },
} as const;

export default conversationsJaJP;

const leadsJaJP = {
  list: {
    title: "相談リード",
    subtitle: "リードの登録・フォローアップ・契約後の案件化までを管理",
    addLead: "新規リード",
    scopeLabel: "表示範囲",
    scope: {
      mine: "自分",
      group: "グループ",
      all: "全所（管理者）",
    },
    searchPlaceholder: "検索：氏名 / 電話 / メール / 番号",
    filters: {
      statusAll: "すべてのステータス",
      ownerAll: "すべての担当者",
      groupAll: "すべてのグループ",
      businessTypeAll: "すべての業務タイプ",
      tagsPlaceholder: "タグで絞り込み",
      dateLabel: "フォローアップ",
      reset: "リセット",
    },
    filterSummary: "表示中：{scope} · {count} 件",
    columns: {
      selectAll: "全選択",
      selectRow: "{name} を選択",
      name: "相談者",
      contact: "連絡先 / 相談内容",
      status: "ステータス",
      owner: "担当 / グループ",
      tags: "タグ",
      followUp: "フォローアップ",
      updated: "最終更新",
    },
    tagsRest: "残り {count} 件のタグ",
    ownerUnassigned: "未割当",
    ownerUnknown: "不明なユーザー",
    status: {
      new: "新規相談",
      following: "フォロー中",
      pending_sign: "契約待ち",
      signed: "契約済み",
      converted_case: "案件作成済み",
      lost: "失注",
    },
    bulk: {
      label: "一括操作",
      selected: "{count} 件選択中",
      clear: "解除",
      assignOwner: "担当者を割当",
      selectOwner: "担当者を選択",
      adjustFollowUp: "フォロー日調整",
      markStatus: "ステータス変更",
      selectStatus: "ステータスを選択",
      addTags: "タグ",
      tagsPlaceholder: "カンマ区切りでタグを入力",
      export: "エクスポート",
      exportBtn: "エクスポート",
      apply: "適用",
    },
    empty: {
      title: "リードがありません",
      description: "新規リードを作成するか、フィルターを調整してください。",
      cta: "新規リード",
    },
    pagination: {
      summary: "{start} – {end} 件表示（全 {total} 件）",
      empty: "データがありません",
      prev: "前へ",
      next: "次へ",
    },
    toast: {
      leadCreated: {
        title: "リード作成済み",
        description: "フォローアップまたは顧客登録へ進めます",
      },
      draftSaved: {
        title: "下書き保存済み",
        description: "リード一覧から「続ける」で作成を完了できます",
      },
      draftLoaded: {
        title: "下書きを読み込みました",
        description: "編集を続けて作成を完了してください",
      },
      bulkAssign: {
        title: "一括割当（デモ）",
        description: "{count} 件選択、担当者：{owner}",
      },
      bulkFollowUp: {
        title: "フォロー日一括調整（デモ）",
        description: "{count} 件選択、次回フォロー：{date}",
      },
      bulkStatus: {
        title: "ステータス一括変更",
        description: "成功 {success} 件、スキップ {skipped} 件",
      },
      bulkTags: {
        title: "タグ一括適用",
        description: "{count} 件にタグ適用：{tags}",
      },
      bulkExport: {
        title: "エクスポート開始",
        description: "{count} 件を {format} でエクスポート",
      },
      createError: {
        title: "作成に失敗しました",
        description: "リードの作成に失敗しました。もう一度お試しください。",
      },
    },
    draft: {
      rowLabel: "下書き",
      continue: "続ける",
      remove: "削除",
    },
    createModal: {
      title: "新規相談リード",
      description:
        "相談情報を入力してください。氏名は必須、電話またはメールを少なくとも1つ入力してください。",
      fields: {
        name: "相談者氏名",
        namePlaceholder: "氏名を入力",
        phone: "電話番号",
        phonePlaceholder: "携帯 / 固定電話",
        email: "メール",
        emailPlaceholder: "メールアドレス",
        source: "流入元",
        sourcePlaceholder: "流入元を選択",
        referrer: "紹介者",
        referrerPlaceholder: "紹介者名または機関名",
        businessType: "業務タイプ",
        businessTypePlaceholder: "タイプを選択",
        group: "グループ",
        groupPlaceholder: "グループを選択",
        owner: "担当者",
        ownerPlaceholder: "担当者を選択",
        language: "言語",
        languagePlaceholder: "言語を選択",
        nextAction: "次のアクション",
        nextActionPlaceholder: "例：電話で意向確認",
        nextFollowUp: "次回フォロー日",
        note: "メモ",
        notePlaceholder: "例：引継ぎ事項、注意点…",
      },
      dedupe: {
        title: "重複の可能性があります",
        description:
          "同一人物でないか確認してください。続けて作成するか、既存レコードを確認できます。",
        continueBtn: "作成を続ける",
        viewBtn: "既存を確認",
      },
      cancel: "キャンセル",
      saveDraft: "下書き保存",
      create: "リードを作成",
    },
  },
  detail: {
    breadcrumbParent: "相談リード",
    notFound: "リードが見つかりません",
    backToList: "リード一覧に戻る",
    tabsLabel: "リード詳細タブ",
    tabs: {
      info: "基本情報",
      followups: "フォロー記録",
      conversations: "会話",
      conversion: "転換情報",
      log: "ログ",
    },
    header: {
      id: "番号",
      owner: "担当者",
      group: "グループ",
    },
    actions: {
      editInfo: "情報を編集",
      changeStatus: "ステータス変更",
      markLost: "失注にする",
      convertCustomer: "顧客のみ作成",
      convertCase: "契約＆案件作成",
      startCaseFromSigned: "案件作成へ",
      viewCustomer: "顧客を見る",
      viewCase: "案件を見る",
    },
    banner: {
      lost: "このリードは失注としてマークされており、閲覧のみ可能です。",
      signedNotConverted:
        "このリードは契約済みです。顧客登録と最初の案件作成に進んでください。",
    },
    infoTab: {
      title: "基本情報",
      fields: {
        id: "リード番号",
        name: "氏名",
        phone: "電話番号",
        email: "メール",
        source: "流入元",
        referrer: "紹介者",
        businessType: "業務タイプ",
        group: "グループ",
        owner: "担当者",
        language: "使用言語",
        tags: "タグ",
        note: "メモ",
      },
      createdViaLabel: "作成元：{via}",
    },
    conversationsTab: {
      empty: "このリードに関連する会話はまだありません。",
    },
    followupsTab: {
      formTitle: "フォロー記録を追加",
      channel: "チャネル",
      channelPlaceholder: "チャネルを選択",
      summary: "概要",
      summaryPlaceholder: "フォロー内容を記入…",
      conclusion: "結論",
      conclusionPlaceholder: "フォローの結論",
      nextAction: "次のアクション",
      nextActionPlaceholder: "次のステップ",
      nextFollowUp: "次回フォロー日",
      submit: "記録する",
      emptyTitle: "フォロー記録がありません",
      emptyDesc: "最初のフォロー記録を追加して、コミュニケーション追跡を開始",
      conclusionLabel: "結論：",
      nextActionLabel: "次のステップ：",
      nextFollowUpLabel: "次回フォロー：",
    },
    conversionTab: {
      dedupClean:
        "重複は検出されませんでした。このリードの電話/メールは既存のリード・顧客と一致しませんでした。",
      dedupTitle: "重複の可能性が検出されました",
      dedupConfirmed: "確認済み（続行）",
      convertCaseTitle: "契約＆案件作成",
      convertCaseDesc: "まず顧客を登録し、その後案件を作成します",
      convertCaseDisabledHint:
        "リードのステータスを「契約済み」に変更してから案件を作成してください",
      convertCustomerTitle: "顧客のみ作成",
      convertCustomerDesc: "案件を作成せず、顧客登録のみ行います",
      convertCustomerDisabledHint:
        "リードのフォローアップを完了し、ステータスを確認してください",
      recordsTitle: "作成済みレコード",
      viewCustomer: "顧客を見る",
      viewCase: "案件を見る",
      historyTitle: "転換履歴",
      typeCustomer: "顧客",
      typeCase: "案件",
    },
    convertDedup: {
      title: "重複の可能性が検出されました",
      description:
        "このリードの電話/メールが既存のリードまたは顧客と一致しています。転換を続行しますか？",
      cancel: "キャンセル",
      confirm: "転換を確認",
    },
    convertCustomerDialog: {
      customerIdLabel: "既存顧客ID（任意）",
      customerIdPlaceholder: "空欄の場合は新規顧客を作成",
      localizedNamesLegend: "多言語名（任意）",
      nameZh: "中国語名",
      nameJa: "日本語名",
      nameEn: "英語名",
      defaultLocaleLabel: "デフォルト言語",
      confirmBtn: "顧客を作成",
    },
    convertCaseDialog: {
      caseTypeLabel: "案件タイプ",
      caseTypePlaceholder: "案件タイプを選択",
      ownerLabel: "案件担当者",
      ownerPlaceholder: "担当者を選択",
      groupLabel: "グループ（任意）",
      groupPlaceholder: "空欄の場合はリードのグループを継承",
      confirmBtn: "案件を作成",
    },
    editInfoDialog: {
      title: "リード情報を編集",
      description: "基本情報を更新します。変更したフィールドのみ送信されます。",
      fields: {
        name: "相談者氏名",
        namePlaceholder: "氏名を入力",
        phone: "電話番号",
        phonePlaceholder: "携帯 / 固定電話",
        email: "メール",
        emailPlaceholder: "メールアドレス",
        source: "流入元",
        sourcePlaceholder: "流入元を選択",
        referrer: "紹介者",
        referrerPlaceholder: "紹介者名または機関名",
        businessType: "業務タイプ",
        businessTypePlaceholder: "タイプを選択",
        group: "グループ",
        groupPlaceholder: "グループを選択",
        owner: "担当者",
        ownerPlaceholder: "担当者を選択",
        language: "使用言語",
        languagePlaceholder: "言語を選択",
        nextAction: "次のアクション",
        nextActionPlaceholder: "例：電話で意向確認",
        note: "メモ",
        notePlaceholder: "例：引継ぎ事項、注意点…",
      },
      confirmBtn: "変更を保存",
    },
    changeStatusDialog: {
      title: "ステータス変更",
      description:
        "遷移先ステータスを選択してください。顧客が複数段階を一気にスキップした場合は対象ステータスへ直接切替できます。誤操作の差戻しも可能です。失注・案件化は専用ボタンをご利用ください。",
      statusLabel: "遷移先ステータス",
      statusPlaceholder: "ステータスを選択",
      noOptions: "現在のステータスから推進可能な遷移先がありません。",
      confirmBtn: "更新を確認",
    },
    markLostDialog: {
      title: "失注にする",
      description:
        "失注理由を記入してください（後の振り返りに使います）。失注後は閲覧のみ可能です。",
      reasonLabel: "失注理由",
      reasonPlaceholder: "例：他事務所を選択された",
      confirmBtn: "失注として確定",
    },
    logTab: {
      title: "操作ログ",
      filterLabel: "ログカテゴリフィルター",
      categoryAll: "すべて",
      typeStatus: "ステータス変更",
      typeOwner: "担当者変更",
      typeGroup: "グループ変更",
      typeInfo: "その他",
      typeConversion: "転換",
      emptyTitle: "ログがありません",
      actorUnknown: "操作者不明",
    },
  },
  options: {
    source: {
      web: "Webフォーム",
      referral: "紹介",
      walkin: "来所",
      phone: "電話",
      other: "その他",
    },
    /** @deprecated 由 shared/i18n/businessTypes BUSINESS_TYPE_LABELS 统一提供；保留一个 release 后移除。 */
    businessType: {
      highlySkilled: "高度専門職",
      workVisa: "技術・人文知識・国際業務",
      familyStay: "家族滞在",
      businessManagementVisa: "経営・管理",
      companySetup: "会社設立",
      permanent: "永住",
      other: "その他",
    },
    language: {
      ja: "日本語",
      zh: "中国語",
      en: "英語",
      vi: "ベトナム語",
    },
    createdVia: {
      admin: "管理画面",
      appUser: "モバイルアプリ",
      portal: "顧客ポータル",
    },
  },
  errors: {
    fetchFailed:
      "リードの読み込みに失敗しました。しばらくしてから再試行してください。",
    updateFailed:
      "リードの更新に失敗しました。しばらくしてから再試行してください。",
    transitionFailed:
      "ステータス変更に失敗しました。現在のステータスを確認して再試行してください。",
    followupFailed:
      "フォロー記録の送信に失敗しました。しばらくしてから再試行してください。",
    dedupFailed:
      "重複チェックに失敗しました。しばらくしてから再試行してください。",
    convertFailed: "転換に失敗しました。しばらくしてから再試行してください。",
    convertCaseFailed:
      "案件の作成に失敗しました。しばらくしてから再試行してください。",
    convertCaseFailedToast: {
      title: "案件作成に失敗しました",
    },
    updateFailedToast: {
      title: "リードの更新に失敗しました",
    },
    transitionFailedToast: {
      title: "ステータス変更に失敗しました",
    },
    markLostFailed:
      "失注処理に失敗しました。しばらくしてから再試行してください。",
    markLostFailedToast: {
      title: "失注処理に失敗しました",
    },
    exportFailed:
      "エクスポートに失敗しました。しばらくしてから再試行してください。",
    bulkPartialFailure:
      "一括操作が一部失敗しました：成功 {success} 件、失敗 {failed} 件。",
    bmvGate: {
      title: "経営管理ビザ案件を作成できません",
      description:
        "顧客カードに戻り、以下のステップを完了してから契約と案件作成に進んでください。",
      questionnaireNotReturned:
        "アンケート未回収です。先に顧客カードでアンケートを完了してください。",
      quoteNotConfirmed:
        "見積もりが未確定です。先に顧客カードで見積もりを確定してください。",
      notSigned: "契約が未完了です。先に顧客カードで契約を登録してください。",
      intakeNotReady:
        "承継フローが完了していません。顧客カードを更新してから再試行してください。",
      featureDisabled:
        "本テナントでは経営管理ビザ機能が無効化されています。管理者に BMV 機能フラグの有効化を依頼するか、別の案件種別を選択してください。",
      unknown:
        "経営管理ビザ承継の前提条件を満たしていません。顧客カードで詳細を確認してください。",
    },
  },
  statusTransition: {
    invalidTransition: "現在のステータスではこの操作は許可されていません。",
    lostReasonRequired: "「失注」にするには失注理由の入力が必須です。",
    lostRevivalTitle: "リード復活の確認",
    lostRevivalDescription:
      "このリードは失注としてマークされています。「フォロー中」に戻してよろしいですか？",
    lostRevivalConfirm: "復活する",
    lostRevivalCancel: "キャンセル",
    lostRevivalSuccess: "リードを「フォロー中」に復活しました。",
    lostRevivalFailed:
      "リードの復活に失敗しました。しばらくしてから再試行してください。",
    transitionSuccess: "ステータスを「{status}」に変更しました。",
    convertedCannotChange: "転換済みのリードはステータスを変更できません。",
  },
  toast: {
    updateSuccess: {
      title: "リードを更新しました",
      description: "変更が保存されました",
    },
    followupSuccess: {
      title: "フォロー記録を送信しました",
      description: "フォロー内容が保存され、次のステップが更新されました",
    },
    transitionSuccess: {
      title: "ステータスを更新しました",
      description: "リードのステータスが「{status}」に変更されました",
    },
    convertSuccess: {
      title: "転換完了",
      description: "顧客レコードが作成されました。案件を開始できます",
    },
    markLostSuccess: {
      title: "失注として記録しました",
      description: "このリードは失注状態となり、閲覧のみ可能です。",
    },
  },
} as const;

export default leadsJaJP;

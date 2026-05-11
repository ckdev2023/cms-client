const caseTemplatesZhCN = {
  title: "案件资料蓝图",
  subtitle: "管理建案时自动生成资料清单所依据的蓝图模板。",
  breadcrumb: "案件资料蓝图",
  columns: {
    templateName: "模板名称",
    caseType: "案件类型",
    applicationType: "申请类型",
    blueprintItems: "清单条目数",
    reviewRequired: "需要复核",
    billingGate: "收费闸口",
    active: "状态",
    updatedAt: "最近更新",
  },
  status: {
    active: "启用",
    inactive: "停用",
  },
  reviewFlag: {
    yes: "是",
    no: "否",
  },
  empty: {
    title: "暂无案件资料蓝图",
    description:
      "案件资料蓝图定义了每种案件类型的资料清单模板。请运行种子脚本或创建模板。",
  },
  filters: {
    caseTypeAll: "全部案件类型",
    includeInactive: "显示已停用",
  },
  state: {
    loading: "正在加载案件资料蓝图…",
    unauthorized: "权限不足，无法查看案件资料蓝图。",
    requestFailed: "加载案件资料蓝图失败，请稍后重试。",
    retry: "重新加载",
  },
  noItems: "—",
  applicationType: {
    none: "—",
  },
  actions: {
    create: "新建模板",
    toggleActive: "切换启停",
    activate: "启用",
    deactivate: "停用",
    importBlueprint: "导入蓝图 JSON",
  },
  createDialog: {
    title: "新建案件资料蓝图",
    description: "定义模板名称和案件类型，可选导入资料蓝图。",
    templateNameLabel: "模板名称",
    templateNamePlaceholder: "例如：家族滞在（首次申请）",
    caseTypeLabel: "案件类型代码",
    caseTypePlaceholder: "例如：dependent_visa",
    applicationTypeLabel: "申请类型（可选）",
    applicationTypePlaceholder: "例如：initial / renewal / change",
    reviewRequiredLabel: "需要复核",
    billingGateModeLabel: "收费闸口模式",
    billingGateModes: {
      warn: "提醒",
      block: "阻断",
      none: "无",
    },
    blueprintLabel: "资料蓝图（JSON）",
    blueprintPlaceholder:
      '{ "items": [ { "code": "passport", "name": "护照" } ] }',
    blueprintFileHint: "或拖入 / 选择 .json 文件",
    cancel: "取消",
    submit: "创建",
    submitting: "创建中…",
  },
  writeState: {
    success: "模板保存成功。",
    unauthorized: "权限不足，无法修改案件资料蓝图。",
    validation: "输入不合法，请检查表单。",
    requestFailed: "保存模板失败，请稍后重试。",
    toggleSuccess: "模板状态已更新。",
  },
} as const;

export default caseTemplatesZhCN;

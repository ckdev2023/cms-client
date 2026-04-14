const settingsZhCN = {
  title: "系统设置",
  subnav: {
    groupManagement: "Group 管理",
    visibilityConfig: "可见性配置",
    storageRoot: "本地资料根目录",
  },
  group: {
    filter: {
      all: "全部",
      active: "启用",
      disabled: "停用",
    },
    status: {
      active: "启用",
      disabled: "停用",
    },
    columns: {
      name: "Group 名称",
      status: "状态",
      createdAt: "创建时间",
      activeCases: "活跃案件",
      members: "成员",
    },
    empty: {
      title: "暂无 Group",
      description: "创建第一个团队开始管理。",
      createFirst: "创建第一个 Group",
    },
    createButton: "新建 Group",
    detail: {
      backToList: "返回列表",
      groupNo: "Group 编号",
      status: "状态",
      members: "成员列表",
      membersEmpty: "暂无成员",
      stats: "关联统计",
      customerCount: "关联客户数",
      activeCaseCount: "关联活跃案件数",
    },
    modal: {
      createTitle: "新建 Group",
      renameTitle: "重命名 Group",
      nameLabel: "Group 名称",
      namePlaceholder: "请输入 Group 名称",
      cancel: "取消",
      create: "创建",
      rename: "确认",
    },
    disableModal: {
      title: "停用 Group",
      confirmSimple: "确定停用「{name}」吗？停用后不可再选择该 Group。",
      confirmReferenced:
        "「{name}」已被 {customerCount} 个客户 / {caseCount} 个案件引用。停用后不可再选择该 Group，已关联对象不受影响。",
      cancel: "取消",
      confirm: "确认停用",
    },
    actions: {
      rename: "重命名",
      disable: "停用",
    },
    memberColumns: {
      name: "姓名",
      role: "角色",
      joinedAt: "加入时间",
    },
  },
  visibility: {
    crossGroupCase: {
      label: "是否允许跨组建案",
      description: "开启后，负责人可在非本组下建立案件。",
    },
    crossGroupView: {
      label: "是否允许负责人查看非本组协作案件",
      description: "开启后，负责人可查看非本组的协作案件。",
    },
    saveButton: "保存",
  },
  storageRoot: {
    fields: {
      rootLabel: {
        label: "根目录名称",
        placeholder: "例：案件资料总盘",
      },
      rootPath: {
        label: "根目录路径 / 挂载点",
        placeholder: "例：\\\\fileserver\\gyosei-docs",
        hint: "仅管理员可见",
      },
    },
    pathStrategy: "系统仅保存 relative_path，禁止在业务对象中记录绝对路径。",
    preview: "路径预览",
    previewTemplate: "{root}/{relative_path}",
    updatedBy: "最后更新人",
    updatedAt: "最后更新时间",
    notConfigured: {
      title: "根目录未配置",
      description:
        "请先配置本地资料根目录。未配置时，资料登记入口的「本地归档」功能将不可用。",
    },
    saveButton: "保存",
  },
  toast: {
    groupCreated: {
      title: "Group 已创建（示例）",
      description: "已创建 Group「{name}」",
    },
    groupRenamed: {
      title: "Group 已重命名（示例）",
      description: "「{oldName}」→「{newName}」",
    },
    groupDisabled: {
      title: "Group 已停用（示例）",
      description: "「{name}」已停用，不可再选择",
    },
    visibilityUpdated: {
      title: "可见性配置已更新（示例）",
      description: "{item} 已{state}",
    },
    storageRootUpdated: {
      title: "根目录配置已更新（示例）",
      description: "根目录已更新为「{name}」",
    },
  },
  permission: {
    denied: "无访问权限，请联系管理员。",
  },
} as const;

export default settingsZhCN;

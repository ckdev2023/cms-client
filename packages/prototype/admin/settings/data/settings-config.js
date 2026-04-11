(function () {
  'use strict';

  var SETTINGS_SUBNAV = [
    { id: 'group-management', label: 'Group 管理', defaultActive: true },
    { id: 'visibility-config', label: '可见性配置' },
    { id: 'storage-root', label: '本地资料根目录' },
  ];

  var GROUP_STATUS_OPTIONS = [
    { value: '', label: '状态：全部' },
    { value: 'active', label: '启用' },
    { value: 'disabled', label: '停用' },
  ];

  var GROUP_TABLE_COLUMNS = [
    { key: 'name', label: 'Group 名称' },
    { key: 'status', label: '状态', width: '100px' },
    { key: 'createdAt', label: '创建时间', responsive: 'md', width: '140px' },
    { key: 'activeCases', label: '活跃案件数', responsive: 'sm', width: '110px', align: 'center' },
    { key: 'memberCount', label: '成员数', responsive: 'sm', width: '80px', align: 'center' },
  ];

  var GROUP_DETAIL_FIELDS = [
    { key: 'name', label: 'Group 名称' },
    { key: 'code', label: 'Group 编号' },
    { key: 'status', label: '状态' },
  ];

  var VISIBILITY_CONFIG = [
    {
      id: 'crossGroupCase',
      toggleId: 'toggleCrossGroupCase',
      label: '是否允许跨组建案',
      description: '启用后，非管理员也可为非本组客户创建案件。跨组建案须留痕（操作人、时间、原因）。',
    },
    {
      id: 'crossGroupView',
      toggleId: 'toggleCrossGroupView',
      label: '是否允许负责人查看非本组协作案件',
      description: '启用后，被指定为协作者的负责人可查看非本组案件信息。',
    },
  ];

  var STORAGE_ROOT_FIELDS = [
    {
      id: 'inputRootName',
      key: 'rootName',
      label: '根目录名称',
      required: true,
      placeholder: '案件资料总盘',
    },
    {
      id: 'inputRootPath',
      key: 'rootPath',
      label: '根目录路径 / 挂载点',
      required: true,
      placeholder: '\\\\server\\share 或 /mnt/docs',
      hint: '仅管理员可见。请输入文件服务器的 UNC 路径或本地挂载点。',
    },
  ];

  var ROLE_MATRIX = [
    { role: '管理员', visible: true,  editable: true,  exportable: true,  note: '全部设置可见可编辑，配置日志需留痕' },
    { role: '主办人', visible: false, editable: false, exportable: false, note: '系统设置页不可见' },
    { role: '助理',   visible: false, editable: false, exportable: false, note: '系统设置页不可见' },
    { role: '销售',   visible: false, editable: false, exportable: false, note: '系统设置页不可见' },
    { role: '财务',   visible: false, editable: false, exportable: false, note: '系统设置页不可见' },
  ];

  var STATUS_BADGE_MAP = {
    active:   { label: '启用', cls: 'badge badge-green' },
    disabled: { label: '停用', cls: 'badge badge-gray' },
  };

  var ROLE_CHIP_STYLES = {
    '管理員': 'bg-blue-50 text-blue-700 border-blue-200',
    '主办人': 'bg-purple-50 text-purple-700 border-purple-200',
    '助理':   'bg-gray-50 text-gray-600 border-gray-200',
    '销售':   'bg-amber-50 text-amber-700 border-amber-200',
    '财务':   'bg-green-50 text-green-700 border-green-200',
  };

  var PATH_STRATEGY_TEXT =
    '系统仅保存 relative_path，禁止在业务对象中记录绝对路径。' +
    '本地根目录在此处统一配置，业务模块自动拼接完整路径。';

  var TOAST = {
    groupCreated:      { title: 'Group 已创建（示例）', desc: '已创建 Group「{name}」' },
    groupRenamed:      { title: 'Group 已重命名（示例）', desc: '「{oldName}」→「{newName}」' },
    groupDisabled:     { title: 'Group 已停用（示例）', desc: '「{name}」已停用，不可再选择' },
    visibilitySaved:   { title: '可见性配置已保存', desc: '变更不回溯影响既有协作关系' },
    storageRootSaved:  { title: '根目录配置已保存', desc: '路径策略已更新' },
    storageRootFailed: { title: '保存失败', desc: '根目录名称和路径均为必填项' },
  };

  var TOAST_DURATION_MS = 2400;

  var CROSS_MODULE_NOTES = {
    visibilityAudit:
      '此处仅控制配置开关。跨组建案/转组/线索转化改组时的原因采集与审计留痕属于业务流程域，不在此页面管理。',
    storageRootNotConfigured:
      '配置根目录后，案件/资料中心的「登记资料（本地归档）」功能才可正常使用。未配置期间该入口将被禁用。',
  };

  window.SettingsConfig = {
    SETTINGS_SUBNAV: SETTINGS_SUBNAV,
    GROUP_STATUS_OPTIONS: GROUP_STATUS_OPTIONS,
    GROUP_TABLE_COLUMNS: GROUP_TABLE_COLUMNS,
    GROUP_DETAIL_FIELDS: GROUP_DETAIL_FIELDS,
    VISIBILITY_CONFIG: VISIBILITY_CONFIG,
    STORAGE_ROOT_FIELDS: STORAGE_ROOT_FIELDS,
    ROLE_MATRIX: ROLE_MATRIX,
    STATUS_BADGE_MAP: STATUS_BADGE_MAP,
    ROLE_CHIP_STYLES: ROLE_CHIP_STYLES,
    PATH_STRATEGY_TEXT: PATH_STRATEGY_TEXT,
    TOAST: TOAST,
    TOAST_DURATION_MS: TOAST_DURATION_MS,
    CROSS_MODULE_NOTES: CROSS_MODULE_NOTES,
    DEFAULT_PANEL: 'group-management',
  };
})();

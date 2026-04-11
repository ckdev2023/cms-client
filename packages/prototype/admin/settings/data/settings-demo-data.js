(function () {
  'use strict';

  var DEMO_GROUPS = [
    {
      id: 'grp-001',
      name: '東京一組',
      status: 'active',
      createdAt: '2024-01-15',
      activeCases: 12,
      memberCount: 4,
      relatedCustomers: 28,
      relatedCases: 35,
    },
    {
      id: 'grp-002',
      name: '東京二組',
      status: 'active',
      createdAt: '2024-03-01',
      activeCases: 8,
      memberCount: 3,
      relatedCustomers: 15,
      relatedCases: 20,
    },
    {
      id: 'grp-003',
      name: '大阪組',
      status: 'disabled',
      createdAt: '2024-02-10',
      activeCases: 0,
      memberCount: 2,
      relatedCustomers: 8,
      relatedCases: 10,
    },
  ];

  var DEMO_GROUP_MEMBERS = {
    'grp-001': [
      { name: 'Admin',    role: '管理員', joinedAt: '2024-01-15' },
      { name: '田中太郎', role: '主办人', joinedAt: '2024-01-20' },
      { name: '鈴木花子', role: '助理',   joinedAt: '2024-02-01' },
      { name: '佐藤一郎', role: '助理',   joinedAt: '2024-03-15' },
    ],
    'grp-002': [
      { name: 'Tom',      role: '主办人', joinedAt: '2024-03-01' },
      { name: '高橋美咲', role: '助理',   joinedAt: '2024-03-10' },
      { name: '山田健一', role: '销售',   joinedAt: '2024-04-01' },
    ],
    'grp-003': [
      { name: '伊藤裕子', role: '主办人', joinedAt: '2024-02-10' },
      { name: '中村大輔', role: '助理',   joinedAt: '2024-02-15' },
    ],
  };

  var DEMO_GROUP_STATS = {
    'grp-001': { customers: 28, cases: 35 },
    'grp-002': { customers: 15, cases: 20 },
    'grp-003': { customers: 8,  cases: 10 },
  };

  var DEMO_ORG_SETTINGS = {
    visibility: {
      crossGroupCase: false,
      crossGroupView: false,
    },
    storageRoot: {
      rootName: '案件資料総盤',
      rootPath: '\\\\fileserver\\gyosei-docs',
      lastUpdatedBy: 'Admin',
      lastUpdatedAt: '2025-03-20 14:30',
    },
  };

  var DEMO_AUDIT_LOG = [
    { id: 'LOG-SET-003', at: '2025-03-20T14:30', actor: 'Admin', message: '更新本地资料根目录配置：rootPath → \\\\fileserver\\gyosei-docs' },
    { id: 'LOG-SET-002', at: '2025-02-15T10:00', actor: 'Admin', message: '创建 Group「大阪組」' },
    { id: 'LOG-SET-001', at: '2024-01-15T09:00', actor: 'Admin', message: '创建 Group「東京一組」' },
  ];

  window.SettingsDemoData = {
    DEMO_GROUPS: DEMO_GROUPS,
    DEMO_GROUP_MEMBERS: DEMO_GROUP_MEMBERS,
    DEMO_GROUP_STATS: DEMO_GROUP_STATS,
    DEMO_ORG_SETTINGS: DEMO_ORG_SETTINGS,
    DEMO_AUDIT_LOG: DEMO_AUDIT_LOG,
  };
})();

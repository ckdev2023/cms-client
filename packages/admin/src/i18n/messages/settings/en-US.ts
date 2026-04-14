const settingsEnUS = {
  title: "System Settings",
  subnav: {
    groupManagement: "Group Management",
    visibilityConfig: "Visibility Settings",
    storageRoot: "Local Document Root",
  },
  group: {
    filter: {
      all: "All",
      active: "Active",
      disabled: "Disabled",
    },
    status: {
      active: "Active",
      disabled: "Disabled",
    },
    columns: {
      name: "Group Name",
      status: "Status",
      createdAt: "Created",
      activeCases: "Active Cases",
      members: "Members",
    },
    empty: {
      title: "No groups yet",
      description: "Create your first team to get started.",
      createFirst: "Create first group",
    },
    createButton: "New Group",
    detail: {
      backToList: "Back to list",
      groupNo: "Group No.",
      status: "Status",
      members: "Members",
      membersEmpty: "No members",
      stats: "Related Statistics",
      customerCount: "Linked Customers",
      activeCaseCount: "Active Cases",
    },
    modal: {
      createTitle: "Create Group",
      renameTitle: "Rename Group",
      nameLabel: "Group Name",
      namePlaceholder: "Enter group name",
      cancel: "Cancel",
      create: "Create",
      rename: "Confirm",
    },
    disableModal: {
      title: "Disable Group",
      confirmSimple:
        'Disable "{name}"? It will no longer be available for selection.',
      confirmReferenced:
        '"{name}" is referenced by {customerCount} customers / {caseCount} cases. After disabling, it cannot be selected for new records, but existing references remain unaffected.',
      cancel: "Cancel",
      confirm: "Disable",
    },
    actions: {
      rename: "Rename",
      disable: "Disable",
    },
    memberColumns: {
      name: "Name",
      role: "Role",
      joinedAt: "Joined",
    },
  },
  visibility: {
    crossGroupCase: {
      label: "Allow cross-group case creation",
      description:
        "When enabled, owners can create cases under groups other than their own.",
    },
    crossGroupView: {
      label: "Allow owners to view cross-group collaboration cases",
      description:
        "When enabled, owners can view collaboration cases from other groups.",
    },
    saveButton: "Save",
  },
  storageRoot: {
    fields: {
      rootLabel: {
        label: "Root directory name",
        placeholder: "e.g. Case Files Drive",
      },
      rootPath: {
        label: "Root path / mount point",
        placeholder: "e.g. \\\\fileserver\\gyosei-docs",
        hint: "Visible to admins only",
      },
    },
    pathStrategy:
      "The system stores only relative_path. Absolute paths must not be recorded in business objects.",
    preview: "Path preview",
    previewTemplate: "{root}/{relative_path}",
    updatedBy: "Last updated by",
    updatedAt: "Last updated at",
    notConfigured: {
      title: "Root directory not configured",
      description:
        "Please configure the local document root directory. Until configured, the local archive feature in document registration will be unavailable.",
    },
    saveButton: "Save",
  },
  toast: {
    groupCreated: {
      title: "Group created (demo)",
      description: 'Created group "{name}"',
    },
    groupRenamed: {
      title: "Group renamed (demo)",
      description: '"{oldName}" → "{newName}"',
    },
    groupDisabled: {
      title: "Group disabled (demo)",
      description: '"{name}" is now disabled and can no longer be selected',
    },
    visibilityUpdated: {
      title: "Visibility updated (demo)",
      description: "{item} has been {state}",
    },
    storageRootUpdated: {
      title: "Root directory updated (demo)",
      description: 'Root directory updated to "{name}"',
    },
  },
  permission: {
    denied: "Access denied. Please contact an administrator.",
  },
} as const;

export default settingsEnUS;

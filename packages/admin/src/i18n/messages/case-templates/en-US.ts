const caseTemplatesEnUS = {
  title: "Case Templates",
  subtitle:
    "Manage document checklist blueprints used to generate document items when creating cases.",
  breadcrumb: "Case templates",
  columns: {
    templateName: "Template name",
    caseType: "Case type",
    applicationType: "Application type",
    blueprintItems: "Checklist items",
    reviewRequired: "Review required",
    billingGate: "Billing gate",
    active: "Status",
    updatedAt: "Last updated",
  },
  status: {
    active: "Active",
    inactive: "Inactive",
  },
  reviewFlag: {
    yes: "Yes",
    no: "No",
  },
  empty: {
    title: "No case templates found",
    description:
      "Case templates define the document checklist blueprint for each case type. Run the seed script or create a template to get started.",
  },
  filters: {
    caseTypeAll: "All case types",
    includeInactive: "Show inactive",
  },
  state: {
    loading: "Loading case templates…",
    unauthorized: "Insufficient permissions to view case templates.",
    requestFailed: "Failed to load case templates. Please try again.",
    retry: "Retry",
  },
  noItems: "—",
  applicationType: {
    none: "—",
  },
  actions: {
    create: "New template",
    toggleActive: "Toggle active",
    activate: "Activate",
    deactivate: "Deactivate",
    importBlueprint: "Import blueprint JSON",
  },
  createDialog: {
    title: "New case template",
    description:
      "Define a template name, case type, and optionally import a requirement blueprint.",
    templateNameLabel: "Template name",
    templateNamePlaceholder: "e.g. Dependent visa (initial application)",
    caseTypeLabel: "Case type code",
    caseTypePlaceholder: "e.g. dependent_visa",
    applicationTypeLabel: "Application type (optional)",
    applicationTypePlaceholder: "e.g. initial / renewal / change",
    reviewRequiredLabel: "Require review",
    billingGateModeLabel: "Billing gate mode",
    billingGateModes: {
      warn: "Warn",
      block: "Block",
      none: "None",
    },
    blueprintLabel: "Requirement blueprint (JSON)",
    blueprintPlaceholder:
      '{ "items": [ { "code": "passport", "name": "Passport" } ] }',
    blueprintFileHint: "Or drop / select a .json file",
    cancel: "Cancel",
    submit: "Create",
    submitting: "Creating…",
  },
  writeState: {
    success: "Template saved successfully.",
    unauthorized: "Insufficient permissions to modify case templates.",
    validation: "Invalid input. Please check the form fields.",
    requestFailed: "Failed to save template. Please try again.",
    toggleSuccess: "Template status updated.",
  },
} as const;

export default caseTemplatesEnUS;

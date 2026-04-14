import customerDetail from "./customers/en-US";
import billing from "./billing/en-US";
import cases from "./cases/en-US";
import documents from "./documents/en-US";
import leads from "./leads/en-US";
import dashboardWorkItems from "./work-items/en-US";

const enUS = {
  shell: {
    topbar: {
      openNavigation: "Open navigation",
      globalSearch: "Global search",
      searchPlaceholder: "Search: customers / cases / files / documents...",
      localeLabel: "Interface language",
      createLead: "New lead",
      createCase: "New case",
    },
    nav: {
      asideLabel: "Sidebar navigation",
      mainLabel: "Main navigation",
      closeNavigation: "Close navigation",
      brandChip: "Firm Ops",
      groups: {
        workspace: "Workspace",
        business: "Business",
        content: "Content",
        finance: "Finance",
        system: "System",
      },
      items: {
        dashboard: "Dashboard",
        leads: "Leads & chats",
        customers: "Customers",
        cases: "Cases",
        tasks: "Tasks & reminders",
        documents: "Document center",
        billing: "Billing & finance",
        settings: "Settings",
      },
    },
  },
  foundation: {
    title: "Foundation",
    subtitle: "Shell + shared UI primitives for onboarding new pages",
    button: "Button",
    buttons: {
      primary: "Primary",
      outlined: "Outlined",
      ghost: "Ghost",
    },
    chip: "Chip",
    chips: {
      default: "Default",
      primary: "Primary",
      success: "Success",
      warning: "Warning",
      danger: "Danger",
    },
    searchField: "SearchField",
    searchPlaceholder: "Search example…",
  },
  sectionPlaceholder: {
    badge: "Planned",
    subtitle:
      "The route for {section} is now registered and ready for the full page.",
    cardTitle: "Page status",
    description:
      "This placeholder keeps sidebar navigation valid for {section} and removes unmatched route warnings until the full module is implemented here.",
    pathLabel: "Current path",
  },
  customers: {
    list: {
      title: "Customers",
      subtitle: "Manage customer profiles, contacts, and linked cases.",
      placeholderMessage: "The customer list is coming soon.",
      addCustomer: "Add customer",
      summaryTitle: "Customer overview",
      summarySubtitle: "Quick snapshot of your customers and case workload.",
      summary: {
        mine: {
          label: "My customers",
          hint: "Customers assigned to the current user — check who needs follow-up today.",
        },
        group: {
          label: "Team customers",
          hint: "All customers in the team — useful for leads to plan allocation and reassignment.",
        },
        active: {
          label: "Active cases",
          hint: "Customers with at least one in-progress case — prioritize recent communications and supplements.",
        },
        noActive: {
          label: "No active cases",
          hint: "Customers without an open case — good candidates for follow-up visits and re-engagement.",
        },
      },
      scopeLabel: "Data scope",
      scope: {
        mine: "Mine",
        group: "My team",
        all: "All (admin)",
      },
      searchPlaceholder: "Search: name / furigana / phone / email",
      filters: {
        groupAll: "Group: All",
        ownerAll: "Owner: All",
        activeCasesAll: "Active cases: All",
        activeCasesYes: "Has active cases",
        activeCasesNo: "No active cases",
        reset: "Reset",
      },
      filterSummary: "Viewing: {scope} · {count} customers",
      columns: {
        customer: "Customer",
        furigana: "Furigana",
        cases: "Cases",
        lastContact: "Last contact",
        owner: "Owner",
        referral: "Referral",
        group: "Group",
        actions: "Actions",
      },
      selectAll: "Select all customers",
      selectRow: "Select {name}",
      casesSummary: "Total {total} · Active {active}",
      bulk: {
        label: "Bulk actions",
        selected: "{count} selected",
        clear: "Clear",
        assignOwner: "Assign owner",
        selectOwner: "Choose owner",
        changeGroup: "Change group",
        selectGroup: "Choose group",
        apply: "Apply",
      },
      empty: {
        title: "No matching customers",
        description: "Try changing the scope or resetting your filters.",
      },
      pagination: {
        summary: "Showing {start}–{end} of {total}",
        prev: "Previous",
        next: "Next",
      },
      actions: {
        viewDetail: "View customer detail",
        createCase: "Start a case for this customer",
      },
      toast: {
        customerCreated: {
          title: "Customer created (demo)",
          description: "Customer profile created — you can now start a case",
        },
        draftSaved: {
          title: "Draft saved",
          description: 'Click "Continue" in the customer list to finish',
        },
        draftLoaded: {
          title: "Draft loaded",
          description: "Complete the form and create the customer",
        },
        bulkAssign: {
          title: "Bulk assign (demo)",
          description: "{count} selected, owner: {owner}",
        },
        bulkGroup: {
          title: "Bulk group change (demo)",
          description: "{count} selected, group: {group} (audit required)",
        },
      },
      draft: {
        rowLabel: "Draft",
        continue: "Continue",
        remove: "Remove",
      },
      createModal: {
        title: "Create individual customer",
        description:
          "Fill in basic info to create a customer record. At least one of phone or email is required for deduplication.",
        fields: {
          displayName: "Display name (internal)",
          displayNamePlaceholder: "e.g. Wang Wei (work visa)",
          group: "Group",
          groupPlaceholder: "Select group",
          legalName: "Legal name",
          legalNamePlaceholder: "Enter full name",
          kana: "Furigana",
          kanaPlaceholder: "e.g. ワン ウェイ",
          gender: "Gender",
          genderDefault: "Any",
          genderMale: "Male",
          genderFemale: "Female",
          birthDate: "Date of birth",
          nationality: "Nationality",
          nationalityPlaceholder: "e.g. China / Japan",
          phone: "Phone",
          phonePlaceholder: "Mobile / landline",
          phoneHint: "Phone or email is required (for deduplication & contact)",
          email: "Email",
          emailPlaceholder: "Email address",
          referrer: "Source / referral",
          referrerPlaceholder: "e.g. referral / introduction",
          avatar: "Avatar",
          note: "Notes (searchable)",
          notePlaceholder: "e.g. handover items, preferences, notes...",
        },
        dedupe: {
          title: "Possible duplicate detected",
          description:
            "Please verify whether these records belong to the same person before saving.",
        },
        cancel: "Cancel",
        saveDraft: "Save draft",
        create: "Create customer",
      },
    },
    detail: customerDetail,
  },
  billing,
  cases,
  documents,
  leads,
  dashboard: {
    hero: {
      kicker: "Dashboard",
      title: "Good morning, {name} · {role}",
      role: "Owner",
      subtitle:
        "Start with today's tasks, overdue or upcoming deadlines, pending submissions, and risk cases.",
    },
    filters: {
      scopeLabel: "View scope",
      groupLabel: "Group filter",
      groups: {
        all: "All groups",
        tokyo1: "Tokyo Team 1",
        tokyo2: "Tokyo Team 2",
        osaka: "Osaka Team",
      },
    },
    scope: {
      mine: "Mine",
      group: "My team",
      all: "All firm",
    },
    scopeSummary: {
      mine: "Showing the cases and tasks I own or participate in. Cards and lists update together.",
      group:
        "Showing the team's cases and tasks so we can plan today's priorities and deadline pressure together.",
      all: "Showing the whole firm so you can quickly scan todos, deadlines, pending submissions, and risks.",
    },
    quickActions: {
      title: "Quick actions",
      subtitle:
        'Turn the "next action" into something clickable and trackable first.',
      viewMyTasks: "View my tasks",
      timeRange: "Time range",
      dayUnit: "{count} days",
      cards: {
        createLead: {
          title: "Create lead",
          desc: "Capture the inquiry first, then convert it into a customer or case",
        },
        createCustomer: {
          title: "Create customer",
          desc: "Quickly register the basic profile for an individual customer",
        },
        createCase: {
          title: "Create case",
          desc: "Generate the initial checklist from a template",
        },
        dueSoon: {
          title: "Chase due items",
          desc: "Bring missing docs, corrections, and deadlines into one place",
        },
      },
      inlineActions: {
        createFollowUp: "Create follow-up task",
        completeToday: "Complete today's tasks",
        goSubmit: "Go to validation & submit",
        addReceipt: "Record payment / upload receipt",
      },
    },
    summary: {
      cards: {
        todayTasks: {
          label: "Today's tasks",
          statusLabel: "Core action",
          helper: "Tasks, follow-ups, and chasers that must be handled today.",
          meta: "Due today",
          action: "Complete in bulk",
        },
        upcomingCases: {
          label: "Overdue / upcoming",
          statusLabel: "Deadlines first",
          helper:
            "Clear overdue cases first, then arrange cases due in the next 7 or 30 days.",
          meta: "Counted by due window",
          action: "View due soon",
        },
        pendingSubmissions: {
          label: "Pending submissions",
          statusLabel: "Ready to submit",
          helper:
            "Materials and checks are done. Continue review and submission.",
          meta: "Waiting for submission",
          action: "Go to submit",
        },
        riskCases: {
          label: "Risk cases",
          statusLabel: "Handle first",
          helper:
            "Fix blockers first: hard stops, urgent corrections, missing docs, and unpaid risks.",
          meta: "Blocked items to resolve",
          action: "Fix risk items",
        },
      },
    },
    panels: {
      todayTodo: {
        tag: "Top Priority",
        title: "Today's tasks",
        subtitle:
          "Handle today's must-do chasers, receipt uploads, missing docs, and billing checks first.",
        action: "Complete in bulk",
        emptyMessage:
          "No tasks are due today. Open the full case list to continue planning.",
        items: {
          missingDocs:
            "Business Manager 4-month proof still needs supplemental documents before 15:00 today.",
          receiptUpload:
            "Customer A's certificate of eligibility has arrived. Upload the receipt next.",
          billingReview:
            "Case B billing confirmation is waiting for owner review to avoid missing tonight's reconciliation.",
        },
      },
      deadlines: {
        tag: "Deadlines",
        title: "Overdue / upcoming",
        subtitle:
          "Clear overdue work first, then arrange cases due in the next 7 or 30 days.",
        action: "View due soon",
        emptyMessage:
          "No overdue or due-soon cases in this window. Switch to the 30-day view to keep scanning.",
        items: {
          overdueCases:
            "Two cases are already overdue. Check missing materials and risk confirmations first.",
          upcomingCases:
            "Five cases will need booking or supplemental filing within the next 7 days.",
        },
      },
      pendingSubmission: {
        tag: "Submission",
        title: "Pending submissions",
        subtitle: "Best for batching review, submission, and receipt uploads.",
        action: "Go to validation & submit",
        emptyMessage:
          "There are no pending submissions right now. Return to the case list and keep moving upstream steps.",
        items: {
          businessManager:
            "Initial Business Manager visa materials after company setup are now complete.",
          engineerRenewal:
            "The Engineer/Specialist renewal case has cleared payment confirmation and can enter final review.",
        },
      },
      risks: {
        tag: "Risks",
        title: "Risk cases",
        subtitle:
          "Pull out what is blocking progress, fix it, then continue submission.",
        action: "Fix risk items",
        emptyMessage:
          "There are no risk cases in the current scope. Keep an eye on deadlines and pending submissions.",
        items: {
          fundSource:
            "The fund source explanation for the Business Manager case is incomplete and needs a clearer transfer trail.",
          contractVersion:
            "Customer C has inconsistent employment contract versions and needs a final signed copy confirmed.",
        },
      },
    },
    visibility: {
      current: {
        label: "Permissions & visibility",
        title: "Current scope notes",
        notes: {
          mine: {
            note1:
              'Owners and assistants default to "Mine" so they can focus on cases they own or support.',
            note2:
              "The homepage always prioritizes today's tasks, overdue or upcoming deadlines, pending submissions, and risk cases.",
            note3:
              "This view is best when you want to finish today's must-do actions first and then move on to due-soon or blocked work.",
          },
          group: {
            note1:
              "The team scope works well for owners and assistants reviewing team todos, deadline pressure, and submission pace.",
            note2:
              "It is useful for creating follow-up tasks in bulk, assigning owners, and pushing review or blocker cleanup before submission.",
            note3:
              "When the scope changes, card counts and lists refresh together while the fixed card layout stays stable.",
          },
          all: {
            note1:
              "The whole-firm scope is only visible to admins and helps them monitor todos, deadlines, pending submissions, and risk pressure across the firm.",
            note2:
              "It works well for leads or admins who want a quick picture of overall progress and what needs attention first.",
            note3:
              "For deeper action, move into the case list to keep filtering and following up from there.",
          },
        },
      },
      tips: {
        label: "Additional notes",
        title: "Usage tips",
        items: {
          tip1: "Cards stay visible even when the count is 0.",
          tip2: "When scope or time window changes, the dashboard shows loading placeholders before cards and lists refresh together.",
          tip3: "This area highlights the four highest-priority work buckets first so you can decide what to do today faster.",
          tip4: "If you need to go deeper into documents, billing, or case details, continue from the related entry point.",
        },
      },
    },
    workItems: dashboardWorkItems,
  },
} as const;

export default enUS;

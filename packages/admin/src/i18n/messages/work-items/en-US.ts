const dashboardWorkItems = {
  mine: {
    todo: {
      uploadReceipt: {
        title: "Upload Li Meiling family stay supplement receipt",
        meta: {
          caseId: "CASE-2409",
          owner: "Owner: Chen Jing",
          time: "Today 11:00",
        },
        desc: "Once the receipt is uploaded, the missing-doc status can be cleared and the owner can continue review.",
        statusLabel: "Must do today",
        action: "Upload receipt",
      },
      chaseVisaDocs: {
        title: "Follow up on Sato Ken visa-change document chase",
        meta: {
          caseId: "CASE-2416",
          owner: "Support: Assistant A",
          time: "Today 14:30",
        },
        desc: "The customer still owes proof of employment and residence certificate. Create a chase task and send a reminder first.",
        statusLabel: "Chasing",
        action: "Create chase task",
      },
      billingReceipt: {
        title: "Confirm whether Gao Qiaoyou's payment proof has arrived",
        meta: {
          caseId: "CASE-2398",
          owner: "Billing checkpoint",
          time: "Today 17:00",
        },
        desc: "If payment still has not arrived, log a dunning task in the pending-payment list.",
        statusLabel: "Impacts collection",
        action: "Record payment",
      },
    },
    deadlines: {
      wangRenewal: {
        title: "Wang Xin engineer renewal",
        meta: {
          caseId: "CASE-2421",
          owner: "Owner: Chen Jing",
          due: "Due: 4/12",
        },
        desc: "Three days remain before the filing deadline. Materials are ready, so moving into validation and submission now is safest.",
        statusLabel: "Due within 3 days",
        action: "Create follow-up",
      },
      zhangFamilyRenewal: {
        title: "Zhang Ning family stay renewal",
        meta: {
          caseId: "CASE-2411",
          owner: "Owner: Chen Jing",
          due: "Due: 4/16",
        },
        desc: "Supplemental materials are complete, but the applicant and related-person records still need consistency review.",
        statusLabel: "Due within 7 days",
        action: "View case",
      },
      yamadaPermanent: {
        title: "Yamada Sho permanent residency",
        meta: {
          caseId: "CASE-2389",
          owner: "Owner: Chen Jing",
          due: "Due: 4/28",
        },
        desc: "The review sheet and fee explanation should be prepared early within the next month.",
        statusLabel: "Within one month",
        action: "Create follow-up",
      },
    },
    submissions: {
      wangSubmit: {
        title: "Wang Xin engineer renewal",
        meta: {
          caseId: "CASE-2421",
          ready: "Materials ready",
          blocker: "Blockers: 0",
        },
        desc: "The package is complete and can move directly into submission flow and submission-bundle generation.",
        statusLabel: "Ready to submit",
        action: "Go to submit",
      },
      zhangSubmit: {
        title: "Zhang Ning family stay renewal",
        meta: {
          caseId: "CASE-2411",
          ready: "Materials ready",
          blocker: "Pending review: spouse docs",
        },
        desc: "If the review workflow is enabled, assign the reviewer first and then continue submission.",
        statusLabel: "Ready to submit",
        action: "Generate submission bundle",
      },
    },
    risks: {
      takaRenewalRisk: {
        title: "Gao Qiaoyou high-skill renewal",
        meta: {
          caseId: "CASE-2398",
          risk: "Collection risk",
          amount: "Outstanding: JPY 180,000",
        },
        desc: "The billing milestone has arrived but payment is still open. Log collection follow-up and pause nonessential progress.",
        statusLabel: "High risk",
        action: "Record payment",
      },
      liCorrectionRisk: {
        title: "Li Meiling family stay correction",
        meta: {
          caseId: "CASE-2409",
          blocker: "Blockers: 1",
          due: "Due: 4/15",
        },
        desc: "Missing correction materials block submission and need to be located in the document checklist immediately.",
        statusLabel: "Hard blocker",
        action: "Locate blocker",
      },
    },
  },
  group: {
    todo: {
      groupTodoOverview: {
        title: "Tokyo Team 1 today's todo overview",
        meta: {
          count: "14 actions",
          owners: "Owners: 3",
          priority: "Clear today's tasks first",
        },
        desc: "The team load is high today, so receipt uploads and deadline chasers should be cleared first.",
        statusLabel: "Team overview",
        action: "Complete in bulk",
      },
      submissionReview: {
        title: "Batch review for pending submissions",
        meta: {
          count: "5 cases",
          owners: "2 owners",
          time: "Schedule review today",
        },
        desc: "This is a good moment to assign one review block and avoid deadline bunching.",
        statusLabel: "Needs planning",
        action: "Go to submit",
      },
    },
    deadlines: {
      groupUrgentDue: {
        title: "Tokyo Team 1 cases due within 3 days",
        meta: {
          count: "2 cases",
          cases: "CASE-2421 / CASE-2430",
          owners: "Owners: Chen Jing / Kobayashi",
        },
        desc: "Follow-up tasks should be created immediately so submission materials and receipts stay aligned.",
        statusLabel: "High priority",
        action: "Bulk follow-up",
      },
      groupWeekDue: {
        title: "Team cases due in the next 7 days",
        meta: {
          count: "6 cases",
          types: "Includes family stay / engineer",
          stage: "Mostly in final supplement stage",
        },
        desc: "Confirm owners and finish supplement chasers today if possible.",
        statusLabel: "Next 7 days",
        action: "Create task",
      },
      groupMonthDue: {
        title: "Team cases due within one month",
        meta: {
          count: "4 more cases",
          schedule: "Needs early scheduling",
          types: "Includes permanent residency",
        },
        desc: "The one-month view gives the team enough lead time to plan the next steps.",
        statusLabel: "Within one month",
        action: "View case",
      },
    },
    submissions: {
      groupSubmissions: {
        title: "Team pending submissions",
        meta: {
          count: "5 cases",
          ready: "Can continue submission",
          review: "Shared review recommended",
        },
        desc: "Submission bundles can be generated in batches from templates to cut repeated work.",
        statusLabel: "Can batch advance",
        action: "Generate submission bundle",
      },
    },
    risks: {
      groupRisks: {
        title: "Tokyo Team 1 risk cases",
        meta: {
          count: "4 cases",
          blockers: "2 hard blockers",
          billing: "2 collection risks",
        },
        desc: "Assign a clear owner to each case first, then break the work into tasks.",
        statusLabel: "Needs ownership",
        action: "Bulk assign",
      },
    },
  },
  all: {
    todo: {
      firmTodoOverview: {
        title: "Whole-firm todo volume today",
        meta: {
          count: "41 actions",
          groups: "Across 5 teams",
          scope: "Whole-firm scope",
        },
        desc: "This is useful on the landing screen for quickly spotting today's most urgent workload distribution.",
        statusLabel: "Firm overview",
        action: "View tasks",
      },
    },
    deadlines: {
      firmWeekDue: {
        title: "Whole-firm due-soon cases in 7 days",
        meta: {
          count: "19 cases",
          groups: "Concentrated in 3 teams",
          schedule: "Needs shared scheduling",
        },
        desc: "It is good for identifying deadline pressure first and then diving into the case list for action.",
        statusLabel: "Firm due soon",
        action: "Create follow-up",
      },
      firmMonthDue: {
        title: "Whole-firm cases due within one month",
        meta: {
          count: "11 more cases",
          schedule: "Long-range scheduling reminder",
          priority: "Plan early",
        },
        desc: "This helps surface cases that will enter supplement or submission stages within the next month.",
        statusLabel: "Within one month",
        action: "View case",
      },
    },
    submissions: {
      firmSubmissions: {
        title: "Whole-firm pending submissions",
        meta: {
          count: "10 cases",
          groups: "Can advance by team",
          review: "Shared review window recommended",
        },
        desc: "Use this with the case list to filter further by owner or stage.",
        statusLabel: "Firm pending submissions",
        action: "Go to submit",
      },
    },
    risks: {
      firmRisks: {
        title: "Whole-firm risk cases",
        meta: {
          count: "9 cases",
          highRisk: "4 high-risk",
          mix: "Collections and blockers overlap",
        },
        desc: "A practical split is blocker fixes, urgent corrections, and payment collection follow-ups.",
        statusLabel: "Management focus",
        action: "Locate blocker",
      },
    },
  },
} as const;

export default dashboardWorkItems;

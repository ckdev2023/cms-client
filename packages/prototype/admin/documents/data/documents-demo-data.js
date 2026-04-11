(function () {
  'use strict';

  var DEMO_DOCUMENT_ROWS = [
    {
      id: 'doc-001',
      docName: '護照複印件',
      caseNo: 'CAS-2026-0181',
      caseLabel: 'CAS-2026-0181 高度人才 (Michael T.)',
      provider: 'main_applicant',
      status: 'uploaded_reviewing',
      deadline: '2026-04-15',
      lastReminder: null,
      relativePath: 'A2026-0181/main_applicant/passport/20260408_passport.pdf',
      versions: [
        { version: 2, fileName: 'passport_v2.pdf', relativePath: 'A2026-0181/main_applicant/passport/20260408_passport.pdf', registeredAt: '2026-04-08', registeredBy: 'Admin', source: 'self', expiryDate: '2031-06-30' },
        { version: 1, fileName: 'passport_v1.pdf', relativePath: 'A2026-0181/main_applicant/passport/20260401_passport.pdf', registeredAt: '2026-04-01', registeredBy: 'Admin', source: 'self', expiryDate: '2031-06-30' },
      ],
      reviewRecords: [],
      reminderRecords: [],
    },
    {
      id: 'doc-002',
      docName: '在留カード（表裏）',
      caseNo: 'CAS-2026-0181',
      caseLabel: 'CAS-2026-0181 高度人才 (Michael T.)',
      provider: 'main_applicant',
      status: 'approved',
      deadline: '2026-04-10',
      lastReminder: null,
      relativePath: 'A2026-0181/main_applicant/residence_card/20260405_card.pdf',
      versions: [
        { version: 1, fileName: 'residence_card.pdf', relativePath: 'A2026-0181/main_applicant/residence_card/20260405_card.pdf', registeredAt: '2026-04-05', registeredBy: 'Admin', source: 'self', expiryDate: '2029-04-05' },
      ],
      reviewRecords: [
        { action: 'approved', actor: 'Admin', timestamp: '2026-04-06T10:00:00', note: '' },
      ],
      reminderRecords: [],
    },
    {
      id: 'doc-003',
      docName: '課税証明書',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'main_applicant',
      status: 'expired',
      deadline: '2026-04-03',
      lastReminder: '2026-04-03',
      relativePath: null,
      versions: [],
      sharedVersionExpiry: true,
      sharedRefCount: 2,
      reviewRecords: [],
      reminderRecords: [
        { sentAt: '2026-04-03T09:00:00', sentBy: 'Admin', method: 'in-app', target: '主申请人' },
      ],
    },
    {
      id: 'doc-004',
      docName: '履歴書',
      caseNo: 'CAS-2026-0204',
      caseLabel: 'CAS-2026-0204 就労签证 (陈某)',
      provider: 'main_applicant',
      status: 'waiting_upload',
      deadline: '2026-04-20',
      lastReminder: '2026-04-05',
      relativePath: null,
      versions: [],
      reviewRecords: [],
      reminderRecords: [
        { sentAt: '2026-04-05T09:00:00', sentBy: 'Admin', method: 'in-app', target: '主申請人' },
      ],
    },
    {
      id: 'doc-005',
      docName: '身元保証書',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'guarantor',
      status: 'revision_required',
      deadline: '2026-04-12',
      lastReminder: '2026-04-06',
      relativePath: 'A2026-0156/guarantor/guarantee/20260404_guarantee.pdf',
      versions: [
        { version: 1, fileName: 'guarantee.pdf', relativePath: 'A2026-0156/guarantor/guarantee/20260404_guarantee.pdf', registeredAt: '2026-04-04', registeredBy: 'Suzuki', source: 'self', expiryDate: null },
      ],
      rejectionReason: '签名处缺失日期',
      reviewRecords: [
        { action: 'rejected', actor: 'Suzuki', timestamp: '2026-04-05T14:00:00', note: '签名处缺失日期' },
      ],
      reminderRecords: [
        { sentAt: '2026-04-06T10:30:00', sentBy: 'Suzuki', method: 'in-app', target: '扶養者/保証人' },
      ],
    },
    {
      id: 'doc-006',
      docName: '課税証明書（保証人）',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'guarantor',
      status: 'waived',
      deadline: null,
      lastReminder: null,
      relativePath: null,
      versions: [],
      waiveReason: 'guarantor-exempt',
      waiveReasonLabel: '保证人为配偶/直系亲属（免除）',
      waivedBy: 'Suzuki',
      waivedAt: '2026-04-03',
      reviewRecords: [],
      reminderRecords: [],
    },
    {
      id: 'doc-007',
      docName: '雇用契約書',
      caseNo: 'CAS-2026-0204',
      caseLabel: 'CAS-2026-0204 就労签证 (陈某)',
      provider: 'employer',
      status: 'uploaded_reviewing',
      deadline: '2026-04-18',
      lastReminder: null,
      relativePath: 'A2026-0204/employer/employment_contract/20260407_contract.pdf',
      versions: [
        { version: 1, fileName: 'employment_contract.pdf', relativePath: 'A2026-0204/employer/employment_contract/20260407_contract.pdf', registeredAt: '2026-04-07', registeredBy: 'Admin', source: 'self', expiryDate: null },
      ],
      reviewRecords: [],
      reminderRecords: [],
    },
    {
      id: 'doc-008',
      docName: '登記事項証明書',
      caseNo: 'CAS-2026-0204',
      caseLabel: 'CAS-2026-0204 就労签证 (陈某)',
      provider: 'employer',
      status: 'approved',
      deadline: '2026-04-10',
      lastReminder: null,
      relativePath: 'A2026-0204/employer/registration_cert/20260403_cert.pdf',
      versions: [
        { version: 1, fileName: 'registration_cert.pdf', relativePath: 'A2026-0204/employer/registration_cert/20260403_cert.pdf', registeredAt: '2026-04-03', registeredBy: 'Admin', source: 'self', expiryDate: '2026-10-03' },
      ],
      referenceSource: { caseNo: 'CAS-2026-0198', docName: '登記事項証明書', version: 1 },
      sharedRefCount: 3,
      reviewRecords: [
        { action: 'approved', actor: 'Admin', timestamp: '2026-04-04T11:00:00', note: '' },
      ],
      reminderRecords: [],
    },
    {
      id: 'doc-009',
      docName: '申請理由書（事務所作成）',
      caseNo: 'CAS-2026-0181',
      caseLabel: 'CAS-2026-0181 高度人才 (Michael T.)',
      provider: 'office',
      status: 'not_sent',
      deadline: '2026-04-22',
      lastReminder: null,
      relativePath: null,
      versions: [],
      reviewRecords: [],
      reminderRecords: [],
    },
    {
      id: 'doc-010',
      docName: '住民票',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'main_applicant',
      status: 'approved',
      deadline: '2026-04-08',
      lastReminder: null,
      relativePath: 'A2026-0156/main_applicant/residence_cert/20260402_juuminhyou.pdf',
      versions: [
        { version: 1, fileName: 'juuminhyou.pdf', relativePath: 'A2026-0156/main_applicant/residence_cert/20260402_juuminhyou.pdf', registeredAt: '2026-04-02', registeredBy: 'Admin', source: 'self', expiryDate: '2026-07-02' },
      ],
      reviewRecords: [
        { action: 'approved', actor: 'Admin', timestamp: '2026-04-03T09:00:00', note: '' },
      ],
      reminderRecords: [],
    },
  ];

  var DEMO_CASES = [
    { value: 'CAS-2026-0181', label: 'CAS-2026-0181 高度人才 (Michael T.)' },
    { value: 'CAS-2026-0156', label: 'CAS-2026-0156 家族滞在 (李明)' },
    { value: 'CAS-2026-0204', label: 'CAS-2026-0204 就労签证 (陈某)' },
  ];

  var DEMO_SUMMARY = {
    reviewing: 2,
    missing: 3,
    expired: 1,
    sharedExpiryRisk: 1,
  };

  var DEMO_REVIEW_RECORDS = [
    { docId: 'doc-002', action: 'approved', actor: 'Admin', timestamp: '2026-04-06T10:00:00', note: '' },
    { docId: 'doc-005', action: 'rejected', actor: 'Suzuki', timestamp: '2026-04-05T14:00:00', note: '签名处缺失日期' },
    { docId: 'doc-008', action: 'approved', actor: 'Admin', timestamp: '2026-04-04T11:00:00', note: '' },
    { docId: 'doc-010', action: 'approved', actor: 'Admin', timestamp: '2026-04-03T09:00:00', note: '' },
  ];

  var DEMO_REMINDER_RECORDS = [
    { docId: 'doc-004', sentAt: '2026-04-05T09:00:00', sentBy: 'Admin', method: 'in-app', target: '主申請人' },
    { docId: 'doc-003', sentAt: '2026-04-03T09:00:00', sentBy: 'Admin', method: 'in-app', target: '主申請人' },
    { docId: 'doc-005', sentAt: '2026-04-06T10:30:00', sentBy: 'Suzuki', method: 'in-app', target: '扶養者/保証人' },
  ];

  var DEMO_REFERENCE_CANDIDATES = [
    {
      id: 'ref-001',
      sourceCase: 'CAS-2026-0181',
      sourceCaseLabel: 'CAS-2026-0181 高度人才 (Michael T.)',
      sourceDocName: '課税証明書',
      version: 1,
      status: 'approved',
      expiryDate: '2027-03-31',
      registeredAt: '2026-03-15',
      reviewedAt: '2026-03-15',
    },
  ];

  var DEMO_SHARED_EXPIRY_RISKS = [
    {
      versionId: 'risk-v001',
      docName: '課税証明書',
      version: 1,
      sourceCase: 'CAS-2026-0156',
      provider: 'main_applicant',
      registeredAt: '2025-12-15',
      expiryDate: '2026-03-31',
      affectedCases: [
        { caseNo: 'CAS-2026-0156', caseLabel: 'CAS-2026-0156 家族滞在 (李明)', docName: '課税証明書', status: 'expired' },
      ],
      suggestedAction: '联系相关提供人补交最新的課税証明書，登记新版本后重新审核',
    },
  ];

  window.DocumentsDemoData = {
    DEMO_DOCUMENT_ROWS: DEMO_DOCUMENT_ROWS,
    DEMO_CASES: DEMO_CASES,
    DEMO_SUMMARY: DEMO_SUMMARY,
    DEMO_REVIEW_RECORDS: DEMO_REVIEW_RECORDS,
    DEMO_REMINDER_RECORDS: DEMO_REMINDER_RECORDS,
    DEMO_REFERENCE_CANDIDATES: DEMO_REFERENCE_CANDIDATES,
    DEMO_SHARED_EXPIRY_RISKS: DEMO_SHARED_EXPIRY_RISKS,
  };
})();

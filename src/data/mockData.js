// ─── USERS ───────────────────────────────────────────────────────────────────
export const USERS = [
  { id: 'u1', name: 'Somchai Jaidee',    role: 'MD',             avatar: 'SJ' },
  { id: 'u2', name: 'Wanchai Pradit',    role: 'CD',             avatar: 'WP' },
  { id: 'u3', name: 'Nattaporn Samart',  role: 'PM',             avatar: 'NS' },
  { id: 'u4', name: 'Araya Dokmai',      role: 'QcDocCenter',    avatar: 'AD' },
  { id: 'u5', name: 'Kritsada Somboon',  role: 'SiteQcInspector',avatar: 'KS' },
];

export const ROLE_LABELS = {
  MD:              'Managing Director',
  CD:              'Construction Director',
  PM:              'Project Manager',
  QcDocCenter:     'QC Document Center',
  SiteQcInspector: 'Site QC Inspector',
};

export const ROLE_COLORS = {
  MD:              'bg-purple-100 text-purple-800',
  CD:              'bg-blue-100 text-blue-800',
  PM:              'bg-sky-100 text-sky-800',
  QcDocCenter:     'bg-emerald-100 text-emerald-800',
  SiteQcInspector: 'bg-amber-100 text-amber-800',
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
export const INITIAL_PROJECTS = [
  {
    id: 'proj-001',
    projectNo:      'CMG-2024-001',
    name:           'Central Warehouse Complex',
    location:       'Rayong Industrial Estate, Rayong',
    pm:             'Nattaporn Samart',
    cm:             'Wanchai Pradit',
    startDate:      '2024-01-15',
    finishDate:     '2025-06-30',
    mainContractor: 'CMG Construction Co., Ltd.',
    subContractor:  'Steel Tech Solutions Co., Ltd.',
    clientName:     'Thai Logistics Group PCL.',
    note:           'Phase 1 of 3. Priority project.',
    status:         'Active',
  },
  {
    id: 'proj-002',
    projectNo:      'CMG-2024-002',
    name:           'Riverside Office Tower',
    location:       'Charoennakorn Rd, Bangkok',
    pm:             'Nattaporn Samart',
    cm:             'Wanchai Pradit',
    startDate:      '2024-03-01',
    finishDate:     '2026-03-31',
    mainContractor: 'CMG Construction Co., Ltd.',
    subContractor:  'MEP Systems Ltd.',
    clientName:     'Riverside Properties Co.',
    note:           '32-storey mixed-use tower.',
    status:         'Active',
  },
  {
    id: 'proj-003',
    projectNo:      'CMG-2023-005',
    name:           'Solar Farm Substation',
    location:       'Nakhon Ratchasima',
    pm:             'Araya Dokmai',
    cm:             'Somchai Jaidee',
    startDate:      '2023-06-01',
    finishDate:     '2024-05-31',
    mainContractor: 'CMG Construction Co., Ltd.',
    subContractor:  'Green Energy Partners',
    clientName:     'EGAT',
    note:           'Completed and in handover phase.',
    status:         'Handover',
  },
];

// ─── QC DOCUMENTS (TRANSMITTALS) ──────────────────────────────────────────────
export const INITIAL_QC_DOCUMENTS = [
  { id: 'doc-001', projectId: 'proj-001', from: 'Client - Thai Logistics', transmittalNo: 'TR-001', transmittalDate: '2024-02-01', byEmail: true, category: 'Structural', documentNo: 'S-DWG-001', documentTitle: 'Foundation Plan - Grid A', receiveDate: '2024-02-03', rev: 'A', status: 'Approved', drawingLink: 'https://drive.google.com' },
  { id: 'doc-002', projectId: 'proj-001', from: 'Client - Thai Logistics', transmittalNo: 'TR-005', transmittalDate: '2024-03-15', byEmail: true, category: 'Structural', documentNo: 'S-DWG-001', documentTitle: 'Foundation Plan - Grid A (Rev B)', receiveDate: '2024-03-17', rev: 'B', status: 'Approved', drawingLink: 'https://drive.google.com' },
  { id: 'doc-003', projectId: 'proj-001', from: 'Consultant A', transmittalNo: 'TR-002', transmittalDate: '2024-02-10', byEmail: false, category: 'Architectural', documentNo: 'A-DWG-010', documentTitle: 'Ground Floor Layout', receiveDate: '2024-02-10', rev: 'A', status: 'For Construction', drawingLink: '' },
  { id: 'doc-004', projectId: 'proj-001', from: 'Consultant A', transmittalNo: 'TR-008', transmittalDate: '2024-04-01', byEmail: true, category: 'Architectural', documentNo: 'A-DWG-010', documentTitle: 'Ground Floor Layout (Rev B)', receiveDate: '2024-04-02', rev: 'B', status: 'For Construction', drawingLink: '' },
  { id: 'doc-005', projectId: 'proj-001', from: 'MEP Consultant', transmittalNo: 'TR-003', transmittalDate: '2024-02-20', byEmail: true, category: 'Mechanical', documentNo: 'M-DWG-005', documentTitle: 'HVAC Ducting Layout - Level 1', receiveDate: '2024-02-21', rev: 'A', status: 'For Review', drawingLink: '' },
  { id: 'doc-006', projectId: 'proj-002', from: 'Client - Riverside', transmittalNo: 'TR-001', transmittalDate: '2024-03-10', byEmail: true, category: 'Structural', documentNo: 'S-DWG-101', documentTitle: 'Pile Cap Details', receiveDate: '2024-03-11', rev: 'A', status: 'Approved', drawingLink: '' },
  { id: 'doc-007', projectId: 'proj-002', from: 'Client - Riverside', transmittalNo: 'TR-003', transmittalDate: '2024-04-05', byEmail: true, category: 'Structural', documentNo: 'S-DWG-101', documentTitle: 'Pile Cap Details Rev B', receiveDate: '2024-04-06', rev: 'B', status: 'Approved', drawingLink: '' },
  { id: 'doc-008', projectId: 'proj-003', from: 'EGAT Engineering', transmittalNo: 'TR-001', transmittalDate: '2023-07-01', byEmail: false, category: 'Electrical', documentNo: 'E-DWG-001', documentTitle: 'Single Line Diagram', receiveDate: '2023-07-01', rev: 'C', status: 'As-Built', drawingLink: '' },
];

// ─── ITP ──────────────────────────────────────────────────────────────────────
export const INITIAL_ITP = [
  { id: 'itp-001', projectId: 'proj-001', item: 'Pile Installation Inspection', itpBy: 'Client ITP', typeItc: 'Civil', attachmentLink: 'https://drive.google.com', note: 'Per ASTM D1143' },
  { id: 'itp-002', projectId: 'proj-001', item: 'Concrete Pour - Raft Foundation', itpBy: 'CMG ITP', typeItc: 'Civil', attachmentLink: '', note: 'Slump test required' },
  { id: 'itp-003', projectId: 'proj-001', item: 'Steel Structure Erection', itpBy: 'CMG ITP', typeItc: 'Steel Structure', attachmentLink: '', note: '' },
  { id: 'itp-004', projectId: 'proj-002', item: 'Curtain Wall Installation', itpBy: 'Client ITP', typeItc: 'Building', attachmentLink: '', note: 'Water tightness test' },
  { id: 'itp-005', projectId: 'proj-002', item: 'MEP Rough-in Inspection', itpBy: 'CMG ITP', typeItc: 'Mechanical', attachmentLink: '', note: '' },
];

// ─── RFI ──────────────────────────────────────────────────────────────────────
export const INITIAL_RFI = [
  {
    id: 'rfi-001', projectId: 'proj-001',
    stage: 4,
    // Stage 1
    sn: 1, requestNo: 'REQ-001', rfiNo: 'RFI-2024-001',
    requestDateInternal: '2024-03-01', requestTimeInternal: '08:00',
    requestDateOwner: '2024-03-01', requestTimeOwner: '09:00',
    typeOfInspection: 'Concrete Pour', location: 'Grid A-B / Level 1', area: 'Foundation',
    detailInspection: 'Inspection of rebar placement before concrete pour for raft foundation.',
    workingStep: 'Rebar & Formwork', referDrawing: 'S-DWG-001 Rev B',
    requestedBy: 'Araya Dokmai', inspectedBy: 'Kritsada Somboon',
    attachmentDoc: '', statusInsp: 'Pass', statusDoc: 'Complete',
    dueDate: '2024-03-05', concretePourDate: '2024-03-02', brand: 'TPI',
    cementBillLink: '', status7Day: 'Pass', status28Day: 'Pass',
    steelTestResult: 'Pass', soilTestResult: 'N/A',
    // Stage 2
    issueDate: '2024-03-01', descriptionOfInspection: 'Rebar placement check for raft foundation Grid A-B',
    inspectionPackage: 'PKG-FOUND-001', inspectionScheduleDate: '2024-03-02',
    inspectionScheduleTime: '09:00', stage2Note: '',
    // Stage 3
    inspectionDate: '2024-03-02', result: 'Pass',
    stage3Note: 'All rebar per drawing. Spacing confirmed.', stage3Attachment: '',
    // Stage 4
    stage4Result: 'Pass', stage4Note: 'Document closed.', stage4Status: 'Complete document', stage4Attachment: '',
  },
  {
    id: 'rfi-002', projectId: 'proj-001',
    stage: 2,
    sn: 2, requestNo: 'REQ-002', rfiNo: 'RFI-2024-002',
    requestDateInternal: '2024-04-10', requestTimeInternal: '10:00',
    requestDateOwner: '2024-04-10', requestTimeOwner: '11:00',
    typeOfInspection: 'Steel Erection', location: 'Grid C-D / Level 2', area: 'Superstructure',
    detailInspection: 'Inspection of steel column erection and bolt tightening.',
    workingStep: 'Steel Erection', referDrawing: 'S-DWG-050',
    requestedBy: 'Araya Dokmai', inspectedBy: 'Kritsada Somboon',
    attachmentDoc: '', statusInsp: 'Pending', statusDoc: 'Pending',
    dueDate: '2024-04-15', concretePourDate: '', brand: '', cementBillLink: '',
    status7Day: '', status28Day: '', steelTestResult: 'Pending', soilTestResult: 'N/A',
    issueDate: '2024-04-10', descriptionOfInspection: 'Steel column erection check Grid C-D Level 2',
    inspectionPackage: 'PKG-STEEL-001', inspectionScheduleDate: '2024-04-12',
    inspectionScheduleTime: '08:30', stage2Note: 'Bring torque wrench records',
    inspectionDate: '', result: '', stage3Note: '', stage3Attachment: '',
    stage4Result: '', stage4Note: '', stage4Status: '', stage4Attachment: '',
  },
  {
    id: 'rfi-003', projectId: 'proj-002',
    stage: 1,
    sn: 1, requestNo: 'REQ-001', rfiNo: 'RFI-2024-101',
    requestDateInternal: '2024-05-01', requestTimeInternal: '09:00',
    requestDateOwner: '2024-05-01', requestTimeOwner: '10:00',
    typeOfInspection: 'Pile Driving', location: 'Zone A', area: 'Foundation',
    detailInspection: 'Pre-inspection for pile driving commencement.',
    workingStep: 'Piling', referDrawing: 'S-DWG-101',
    requestedBy: 'Araya Dokmai', inspectedBy: 'Kritsada Somboon',
    attachmentDoc: '', statusInsp: 'Pending', statusDoc: 'Pending',
    dueDate: '2024-05-05', concretePourDate: '', brand: '', cementBillLink: '',
    status7Day: '', status28Day: '', steelTestResult: 'N/A', soilTestResult: 'Pending',
    issueDate: '', descriptionOfInspection: '', inspectionPackage: '',
    inspectionScheduleDate: '', inspectionScheduleTime: '', stage2Note: '',
    inspectionDate: '', result: '', stage3Note: '', stage3Attachment: '',
    stage4Result: '', stage4Note: '', stage4Status: '', stage4Attachment: '',
  },
];

// ─── MATERIAL RECEIVE ─────────────────────────────────────────────────────────
export const INITIAL_MATERIALS = [
  { id: 'mat-001', projectId: 'proj-001', matRevNo: 'MR-2024-001', description: 'Deformed Bar DB25 Grade SD50', materialSpecPackage: 'SPEC-STR-001', result: 'Pass', includeTestResult: true, noteOfTest: 'Mill cert. reviewed and approved. Tensile test passed.' },
  { id: 'mat-002', projectId: 'proj-001', matRevNo: 'MR-2024-002', description: 'Portland Cement Type I (TPI Brand)', materialSpecPackage: 'SPEC-CON-001', result: 'Pass', includeTestResult: false, noteOfTest: 'Visual check OK. No moisture damage.' },
  { id: 'mat-003', projectId: 'proj-002', matRevNo: 'MR-2024-001', description: 'Structural Steel H-Beam 300x300', materialSpecPackage: 'SPEC-STR-101', result: 'Reject', includeTestResult: true, noteOfTest: 'Dimension deviation found. Returned to supplier.' },
];

// ─── NCR ──────────────────────────────────────────────────────────────────────
export const INITIAL_NCR = [
  { id: 'ncr-001', projectId: 'proj-001', ncrNo: 'NCR-2024-001', type: 'Internal NCR', assignedTo: 'Site Foreman - Team A', attDocument: '', actionToClose: 'Re-pour with correct mix design. Lab test required.', status: 'Close' },
  { id: 'ncr-002', projectId: 'proj-001', ncrNo: 'NCR-2024-002', type: 'External NCR', assignedTo: 'Steel Tech Solutions', attDocument: '', actionToClose: 'Replace non-conforming bolts. Re-torque and submit report.', status: 'Reject' },
  { id: 'ncr-003', projectId: 'proj-002', ncrNo: 'NCR-2024-001', type: 'External NCR', assignedTo: 'MEP Systems Ltd.', attDocument: '', actionToClose: 'Correct pipe routing per approved drawing.', status: 'With Comment' },
];

// ─── PUNCH LIST ───────────────────────────────────────────────────────────────
export const INITIAL_PUNCHLIST = [
  { id: 'pl-001', projectId: 'proj-001', punchNo: 'PL-2024-001', description: 'Crack in column C5 surface finish', categoryLegend: 'B', location: 'Grid C5 / Level 1', openPhoto: '', openDate: '2024-05-10', inspectionDate: '2024-05-15', inspectionStatus: 'close', note: 'Patched and approved.' },
  { id: 'pl-002', projectId: 'proj-001', punchNo: 'PL-2024-002', description: 'Missing sealant at curtain wall joint', categoryLegend: 'A', location: 'Facade / West Wing', openPhoto: '', openDate: '2024-05-12', inspectionDate: '', inspectionStatus: 'ongoing', note: '' },
  { id: 'pl-003', projectId: 'proj-001', punchNo: 'PL-2024-003', description: 'Incorrect paint color - office corridor', categoryLegend: 'C', location: 'Level 2 Corridor', openPhoto: '', openDate: '2024-05-20', inspectionDate: '', inspectionStatus: 'hold', note: 'Awaiting client color confirmation.' },
  { id: 'pl-004', projectId: 'proj-002', punchNo: 'PL-2024-001', description: 'Hollow tile sound in lobby floor', categoryLegend: 'A', location: 'Ground Floor Lobby', openPhoto: '', openDate: '2024-06-01', inspectionDate: '', inspectionStatus: 'ongoing', note: '' },
];

// ─── HANDOVER ─────────────────────────────────────────────────────────────────
export const INITIAL_HANDOVER = [
  { id: 'ho-001', projectId: 'proj-001', areaName: 'Foundation Zone A', handoverDate: '2024-04-30', status: 'Closed', docPackageRef: 'PKG-FOUND-001', note: 'All punch items closed.' },
];

// ─── FINAL PACKAGE ────────────────────────────────────────────────────────────
export const INITIAL_FINAL_PACKAGE = [
  { id: 'fp-001', projectId: 'proj-001', pillar: 'ITP/RFI', title: 'Foundation ITP & RFI Bundle', ref: 'PKG-FOUND-001', status: 'Archived', date: '2024-05-01' },
  { id: 'fp-002', projectId: 'proj-001', pillar: 'Material Approval', title: 'Rebar & Cement Approval Docs', ref: 'MAT-FOUND-001', status: 'Archived', date: '2024-04-15' },
];

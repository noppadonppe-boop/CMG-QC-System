export const APP_NAME   = 'QC-System';
export const APP_PREFIX = 'cmg_qc';

export const USER_ROLES = [
  'MasterAdmin',
  'SuperAdmin',
  'Admin',
  'MD',
  'CD',
  'PM',
  'QcDocCenter',
  'SiteQcInspector',
  'Staff',
];

export const ADMIN_ROLES = ['MasterAdmin', 'SuperAdmin', 'Admin'];

export const ROLE_LABELS = {
  MasterAdmin:      'Master Admin',
  SuperAdmin:       'Super Admin',
  Admin:            'Admin',
  MD:               'Managing Director',
  CD:               'Construction Director',
  PM:               'Project Manager',
  QcDocCenter:      'QC Document Center',
  SiteQcInspector:  'Site QC Inspector',
  Staff:            'Staff',
};

export const ROLE_COLORS = {
  MasterAdmin:      'bg-red-100 text-red-800',
  SuperAdmin:       'bg-purple-100 text-purple-800',
  Admin:            'bg-blue-100 text-blue-800',
  MD:               'bg-indigo-100 text-indigo-800',
  CD:               'bg-sky-100 text-sky-800',
  PM:               'bg-cyan-100 text-cyan-800',
  QcDocCenter:      'bg-emerald-100 text-emerald-800',
  SiteQcInspector:  'bg-amber-100 text-amber-800',
  Staff:            'bg-slate-100 text-slate-700',
};

export const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-800',
  approved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
};

export const STATUS_LABELS = {
  pending:  'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
};

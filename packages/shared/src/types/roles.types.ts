export enum SystemRole {
  SUPER_ADMIN = 'super_admin', // Platform owner (you)
  ADMIN = 'admin', // Company admin
  MANAGER = 'manager', // Department manager
  ACCOUNTANT = 'accountant', // Accounting access
  HR_MANAGER = 'hr_manager', // HR + Payroll access
  HR_STAFF = 'hr_staff', // HR read access
  SALES = 'sales', // CRM + Sales access
  INVENTORY = 'inventory', // Inventory access
  CASHIER = 'cashier', // POS access only
  SUPPORT = 'support', // Customer service access
  EMPLOYEE = 'employee', // Basic employee self-service
  VIEWER = 'viewer', // Read-only access
}

export enum Permission {
  // Auth
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Accounting
  ACCOUNTING_VIEW = 'accounting:view',
  ACCOUNTING_CREATE = 'accounting:create',
  ACCOUNTING_UPDATE = 'accounting:update',
  ACCOUNTING_DELETE = 'accounting:delete',
  ACCOUNTING_APPROVE = 'accounting:approve',

  // Inventory
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_CREATE = 'inventory:create',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_DELETE = 'inventory:delete',

  // CRM
  CRM_VIEW = 'crm:view',
  CRM_CREATE = 'crm:create',
  CRM_UPDATE = 'crm:update',
  CRM_DELETE = 'crm:delete',

  // HR
  HR_VIEW = 'hr:view',
  HR_CREATE = 'hr:create',
  HR_UPDATE = 'hr:update',
  HR_DELETE = 'hr:delete',
  PAYROLL_RUN = 'payroll:run',
  PAYROLL_APPROVE = 'payroll:approve',

  // POS
  POS_ACCESS = 'pos:access',
  POS_REFUND = 'pos:refund',
  POS_DISCOUNT = 'pos:discount',
  POS_VOID = 'pos:void',

  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',
  BILLING_MANAGE = 'billing:manage',
}

// Default role-permission mapping
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.SUPER_ADMIN]: Object.values(Permission),
  [SystemRole.ADMIN]: Object.values(Permission).filter((p) => p !== Permission.BILLING_MANAGE),
  [SystemRole.MANAGER]: [
    Permission.USERS_VIEW,
    Permission.ACCOUNTING_VIEW,
    Permission.ACCOUNTING_CREATE,
    Permission.ACCOUNTING_UPDATE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_CREATE,
    Permission.INVENTORY_UPDATE,
    Permission.CRM_VIEW,
    Permission.CRM_CREATE,
    Permission.CRM_UPDATE,
    Permission.HR_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW,
  ],
  [SystemRole.ACCOUNTANT]: [
    Permission.ACCOUNTING_VIEW,
    Permission.ACCOUNTING_CREATE,
    Permission.ACCOUNTING_UPDATE,
    Permission.ACCOUNTING_APPROVE,
    Permission.INVENTORY_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
  [SystemRole.HR_MANAGER]: [
    Permission.HR_VIEW,
    Permission.HR_CREATE,
    Permission.HR_UPDATE,
    Permission.HR_DELETE,
    Permission.PAYROLL_RUN,
    Permission.PAYROLL_APPROVE,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
  [SystemRole.HR_STAFF]: [
    Permission.HR_VIEW,
    Permission.HR_CREATE,
    Permission.HR_UPDATE,
    Permission.REPORTS_VIEW,
  ],
  [SystemRole.SALES]: [
    Permission.CRM_VIEW,
    Permission.CRM_CREATE,
    Permission.CRM_UPDATE,
    Permission.ACCOUNTING_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.REPORTS_VIEW,
  ],
  [SystemRole.INVENTORY]: [
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_CREATE,
    Permission.INVENTORY_UPDATE,
    Permission.REPORTS_VIEW,
  ],
  [SystemRole.CASHIER]: [
    Permission.POS_ACCESS,
    Permission.POS_DISCOUNT,
    Permission.INVENTORY_VIEW,
  ],
  [SystemRole.SUPPORT]: [
    Permission.CRM_VIEW,
    Permission.CRM_UPDATE,
  ],
  [SystemRole.EMPLOYEE]: [],
  [SystemRole.VIEWER]: [
    Permission.ACCOUNTING_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.CRM_VIEW,
    Permission.HR_VIEW,
    Permission.REPORTS_VIEW,
  ],
}

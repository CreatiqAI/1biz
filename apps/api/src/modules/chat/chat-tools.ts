import type { Tool } from '@anthropic-ai/sdk/resources/messages'

/** Maps each tool to the module(s) it requires. Tools without a mapping are always available. */
export const TOOL_MODULE_MAP: Partial<Record<ToolName, string>> = {
  // Accounting
  get_invoices: 'ACCOUNTING', get_payments: 'ACCOUNTING', get_contacts: 'ACCOUNTING',
  get_journals: 'ACCOUNTING', get_bills: 'ACCOUNTING', get_trial_balance: 'ACCOUNTING',
  get_profit_loss: 'ACCOUNTING', get_balance_sheet: 'ACCOUNTING', get_ar_aging: 'ACCOUNTING',
  get_ap_aging: 'ACCOUNTING', get_bank_accounts: 'ACCOUNTING', get_bank_transactions: 'ACCOUNTING',
  get_tax_codes: 'ACCOUNTING', get_compliance_dashboard: 'ACCOUNTING', get_compliance_obligations: 'ACCOUNTING',
  create_contact: 'ACCOUNTING', create_invoice: 'ACCOUNTING', update_invoice_status: 'ACCOUNTING',
  record_payment: 'ACCOUNTING', create_journal_entry: 'ACCOUNTING', post_journal_entry: 'ACCOUNTING',
  reverse_journal_entry: 'ACCOUNTING', create_bill: 'ACCOUNTING', approve_bill: 'ACCOUNTING',
  pay_bill: 'ACCOUNTING', create_credit_note: 'ACCOUNTING', create_debit_note: 'ACCOUNTING',
  create_bank_account: 'ACCOUNTING', create_bank_transaction: 'ACCOUNTING', match_bank_transaction: 'ACCOUNTING',
  seed_tax_codes: 'ACCOUNTING', generate_monthly_obligations: 'ACCOUNTING', complete_compliance_obligation: 'ACCOUNTING',
  get_einvoice_status: 'ACCOUNTING', submit_einvoice: 'ACCOUNTING', cancel_einvoice: 'ACCOUNTING',
  // Inventory
  get_products: 'INVENTORY', get_low_stock: 'INVENTORY', get_warehouses: 'INVENTORY',
  get_stock_movements: 'INVENTORY', create_product: 'INVENTORY', record_stock_movement: 'INVENTORY',
  // HR
  get_employees: 'HR', get_departments: 'HR', get_leave_types: 'HR', get_leave_balances: 'HR',
  get_leave_requests: 'HR', get_holidays: 'HR', get_work_entries: 'HR', get_monthly_attendance: 'HR',
  get_attendance_summary: 'HR', get_claims: 'HR', get_claim_types: 'HR', get_employment_history: 'HR',
  create_employee: 'HR', update_employee: 'HR', update_employee_status: 'HR', create_department: 'HR',
  submit_leave_request: 'HR', approve_leave_request: 'HR', reject_leave_request: 'HR',
  create_holiday: 'HR', seed_holidays: 'HR', record_work_entry: 'HR',
  submit_claim: 'HR', approve_claim: 'HR', reject_claim: 'HR',
  record_job_change: 'HR', calculate_termination: 'HR', process_termination: 'HR', init_leave_balances: 'HR',
  // Payroll
  get_payroll_runs: 'PAYROLL', get_payroll_items: 'PAYROLL',
  create_payroll_run: 'PAYROLL', generate_payroll_items: 'PAYROLL',
  approve_payroll_run: 'PAYROLL', mark_payroll_paid: 'PAYROLL',
  // CRM
  get_leads: 'CRM', get_opportunities: 'CRM', get_quotations: 'CRM',
  create_lead: 'CRM', update_lead_status: 'CRM', create_opportunity: 'CRM',
  update_opportunity_stage: 'CRM', create_quotation: 'CRM', update_quotation_status: 'CRM',
  convert_quotation_to_invoice: 'CRM',
}

/** Filter tools to only those the tenant has access to */
export function filterToolsByModules(tools: Tool[], enabledModules: string[]): Tool[] {
  return tools.filter((tool) => {
    const requiredModule = TOOL_MODULE_MAP[tool.name as ToolName]
    if (!requiredModule) return true // dashboard, confirm_action, etc. — always available
    return enabledModules.includes(requiredModule)
  })
}

export type ToolName =
  // ─── Read tools ───────────────────────────────────────────────────────────
  | 'get_dashboard_stats'
  | 'get_invoices'
  | 'get_payments'
  | 'get_contacts'
  | 'get_products'
  | 'get_low_stock'
  | 'get_employees'
  | 'get_departments'
  | 'get_warehouses'
  | 'get_stock_movements'
  | 'get_leave_types'
  | 'get_leave_balances'
  | 'get_leave_requests'
  | 'get_payroll_runs'
  | 'get_payroll_items'
  | 'get_leads'
  | 'get_opportunities'
  | 'get_quotations'
  | 'get_holidays'
  | 'get_work_entries'
  | 'get_monthly_attendance'
  | 'get_attendance_summary'
  | 'get_claims'
  | 'get_claim_types'
  | 'get_employment_history'
  // ─── Accounting read tools ──────────────────────────────────────────────
  | 'get_journals'
  | 'get_bills'
  | 'get_trial_balance'
  | 'get_profit_loss'
  | 'get_balance_sheet'
  | 'get_ar_aging'
  | 'get_ap_aging'
  | 'get_bank_accounts'
  | 'get_bank_transactions'
  | 'get_tax_codes'
  | 'get_compliance_dashboard'
  | 'get_compliance_obligations'
  // ─── Confirmation flow ────────────────────────────────────────────────────
  | 'confirm_action'
  | 'execute_confirmed_action'
  // ─── Write tools ──────────────────────────────────────────────────────────
  | 'create_employee'
  | 'update_employee'
  | 'update_employee_status'
  | 'create_contact'
  | 'create_invoice'
  | 'update_invoice_status'
  | 'record_payment'
  | 'create_product'
  | 'record_stock_movement'
  | 'create_department'
  | 'create_lead'
  | 'update_lead_status'
  | 'create_opportunity'
  | 'update_opportunity_stage'
  | 'submit_leave_request'
  | 'approve_leave_request'
  | 'reject_leave_request'
  | 'create_payroll_run'
  | 'generate_payroll_items'
  | 'approve_payroll_run'
  | 'mark_payroll_paid'
  | 'create_quotation'
  | 'update_quotation_status'
  | 'convert_quotation_to_invoice'
  | 'create_holiday'
  | 'seed_holidays'
  | 'record_work_entry'
  | 'submit_claim'
  | 'approve_claim'
  | 'reject_claim'
  | 'record_job_change'
  | 'calculate_termination'
  | 'process_termination'
  | 'init_leave_balances'
  // ─── Accounting write tools ─────────────────────────────────────────────
  | 'create_journal_entry'
  | 'post_journal_entry'
  | 'reverse_journal_entry'
  | 'create_bill'
  | 'approve_bill'
  | 'pay_bill'
  | 'create_credit_note'
  | 'create_debit_note'
  | 'create_bank_account'
  | 'create_bank_transaction'
  | 'match_bank_transaction'
  | 'seed_tax_codes'
  | 'generate_monthly_obligations'
  | 'complete_compliance_obligation'
  // ─── E-Invoice (MyInvois) ──────────────────────────────────────────────
  | 'get_einvoice_status'
  | 'submit_einvoice'
  | 'cancel_einvoice'

// Helper: string enum property
function enumProp(description: string, values: string[]) {
  return { type: 'string' as const, description, enum: values }
}

// Helper: plain string property
function strProp(description: string) {
  return { type: 'string' as const, description }
}

// Helper: integer property
function intProp(description: string) {
  return { type: 'integer' as const, description }
}

// Helper: number property
function numProp(description: string) {
  return { type: 'number' as const, description }
}

// Helper: empty-params schema
function noParams(): Tool['input_schema'] {
  return { type: 'object' as const, properties: {} }
}

export const CHAT_TOOLS: Tool[] = [
  // ─── Read tools ─────────────────────────────────────────────────────────────
  {
    name: 'get_dashboard_stats',
    description:
      'Get an overview of business health: outstanding invoice count and amount, billed revenue this month vs last month, active employee count, low stock product count, 5 most recent invoices, 5 most recent payments, and a 6-month revenue chart.',
    input_schema: noParams(),
  },
  {
    name: 'get_invoices',
    description:
      'List sales invoices. Optionally filter by status. Returns invoice id, invoice number, contact name, issue date, due date, status, total amount (in sen), paid amount (in sen), and balance owed (in sen).',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter invoices by status. Omit to get all invoices.', [
          'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED',
        ]),
      },
    },
  },
  {
    name: 'get_payments',
    description:
      'List payment records (money received from customers or paid to suppliers). Returns payment number, type, date, amount (in sen), payment method, and contact name.',
    input_schema: noParams(),
  },
  {
    name: 'get_contacts',
    description:
      'List contacts (customers, suppliers, or both). Returns id, name, company name, contact type, email, phone, city, and state. Always call this before creating invoices or opportunities to find the correct contactId.',
    input_schema: {
      type: 'object',
      properties: {
        type: enumProp('Filter by contact type.', ['CUSTOMER', 'SUPPLIER', 'BOTH']),
      },
    },
  },
  {
    name: 'get_products',
    description:
      'List products in the inventory catalog. Returns SKU, name, selling price (in sen), cost price (in sen), total stock quantity, reorder point, and active status. Optionally search by name, SKU, or barcode.',
    input_schema: {
      type: 'object',
      properties: {
        search: strProp('Search term to filter products by name, SKU, or barcode.'),
      },
    },
  },
  {
    name: 'get_low_stock',
    description:
      'Get products that are at or below their reorder point — items that need restocking. Returns product name, SKU, current total stock, and reorder point.',
    input_schema: noParams(),
  },
  {
    name: 'get_employees',
    description:
      'List employees. Optionally filter by employment status. Returns employee id, employee number, full name, email, department, position, employment type, hire date, status, and basic salary (in sen).',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter by employment status. Omit for all employees.', [
          'ACTIVE', 'PROBATION', 'RESIGNED', 'TERMINATED',
        ]),
      },
    },
  },
  {
    name: 'get_leave_requests',
    description:
      'List leave requests across all employees. Optionally filter by approval status. Returns id, employee name, leave type, start date, end date, number of days, reason, and status (PENDING/APPROVED/REJECTED). Always call this with status=PENDING before approving a leave request.',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter by leave request status.', ['PENDING', 'APPROVED', 'REJECTED']),
      },
    },
  },
  {
    name: 'get_payroll_runs',
    description:
      'List payroll processing runs ordered by most recent first. Returns period (month/year), status, employee count, total gross salary, total net salary, total EPF, SOCSO, EIS, and PCB (all in sen).',
    input_schema: noParams(),
  },
  {
    name: 'get_leads',
    description:
      'List CRM leads (potential customers in the early pipeline). Optionally filter by status. Returns id, lead name, company, email, phone, source, status, and expected deal value (in sen).',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter by lead status.', ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST']),
      },
    },
  },
  {
    name: 'get_opportunities',
    description:
      'List sales opportunities in the CRM pipeline. Optionally filter by stage. Returns id, opportunity name, contact name, stage, probability %, expected value (in sen), and expected close date.',
    input_schema: {
      type: 'object',
      properties: {
        stage: enumProp('Filter by pipeline stage.', [
          'PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST',
        ]),
      },
    },
  },
  {
    name: 'get_quotations',
    description:
      'List quotations sent to customers. Optionally filter by status. Returns quotation number, contact name, issue date, expiry date, status, and total amount (in sen).',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter by quotation status.', [
          'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED',
        ]),
      },
    },
  },

  // ─── Confirmation flow ───────────────────────────────────────────────────────
  {
    name: 'confirm_action',
    description:
      'Present a confirmation summary to the user before performing any write operation. Call this after collecting all required fields. The backend will return the summary and wait for the user to say yes/confirm before executing. ALWAYS call this before execute_confirmed_action.',
    input_schema: {
      type: 'object',
      properties: {
        action: strProp('The action to be performed (e.g. create_employee, create_invoice, approve_leave_request).'),
        summary: strProp('A human-readable summary of what will be done, with key details listed. E.g. "Create employee: Ahmad Bin Ali, Hire date: 01 Mar 2026, Salary: RM 3,500.00, Type: FULL_TIME"'),
        payload: strProp('JSON string of the complete payload that will be passed to execute_confirmed_action. Must be valid JSON.'),
      },
      required: ['action', 'summary', 'payload'],
    },
  },
  {
    name: 'execute_confirmed_action',
    description:
      'Execute a previously confirmed write action. Only call this after the user has explicitly said yes/confirm/proceed in response to a confirm_action summary. Pass the exact same action and payload from confirm_action.',
    input_schema: {
      type: 'object',
      properties: {
        action: strProp('The action to execute (must match the action from confirm_action).'),
        payload: strProp('JSON string of the payload, exactly as used in confirm_action.'),
      },
      required: ['action', 'payload'],
    },
  },

  // ─── Write tools ─────────────────────────────────────────────────────────────
  {
    name: 'create_employee',
    description: 'Create a new employee record. Collect fullName and hireDate at minimum; ask for salary, employment type, department and position if not provided.',
    input_schema: {
      type: 'object',
      properties: {
        fullName: strProp('Employee full name.'),
        hireDate: strProp('Hire date in YYYY-MM-DD format.'),
        basicSalarySen: intProp('Monthly basic salary in sen (e.g. RM 3,500 = 350000). Convert RM amounts by multiplying by 100.'),
        employmentType: enumProp('Employment type (optional, defaults to FULL_TIME).', ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
        icNumber: strProp('Malaysian IC number (optional).'),
        email: strProp('Work email address (optional).'),
        phone: strProp('Phone number (optional).'),
        departmentId: strProp('Department UUID (optional).'),
        positionId: strProp('Position UUID (optional).'),
        nationality: strProp('Nationality (optional, defaults to Malaysian).'),
      },
      required: ['fullName', 'hireDate'],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new customer or supplier contact.',
    input_schema: {
      type: 'object',
      properties: {
        type: enumProp('Contact type.', ['CUSTOMER', 'SUPPLIER', 'BOTH']),
        name: strProp('Contact full name or primary name.'),
        companyName: strProp('Company / business name (optional).'),
        email: strProp('Email address (optional).'),
        phone: strProp('Phone number (optional).'),
        city: strProp('City (optional).'),
        state: strProp('Malaysian state (optional).'),
        paymentTerms: intProp('Payment terms in days (optional, defaults to 30).'),
      },
      required: ['type', 'name'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a new sales invoice. Always call get_contacts first to find the correct contactId. Lines require description, quantity, and unit price in sen.',
    input_schema: {
      type: 'object',
      properties: {
        contactId: strProp('Contact UUID (customer). Call get_contacts to find this ID.'),
        issueDate: strProp('Invoice issue date in YYYY-MM-DD format.'),
        dueDate: strProp('Payment due date in YYYY-MM-DD format (optional).'),
        notes: strProp('Internal notes or payment terms (optional).'),
        lines: strProp('JSON array string of line items. Each: {"description":"string","quantity":number,"unitPriceSen":number,"discountPercent":number,"sstRate":number}. Example: [{"description":"Web design","quantity":1,"unitPriceSen":500000}]'),
      },
      required: ['contactId', 'issueDate', 'lines'],
    },
  },
  {
    name: 'update_invoice_status',
    description: 'Update the status of an invoice (e.g. mark as SENT, PAID, or CANCELLED). Call get_invoices first to find the invoice ID.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: strProp('Invoice UUID. Call get_invoices to find this.'),
        status: enumProp('New status for the invoice.', ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']),
      },
      required: ['invoiceId', 'status'],
    },
  },
  {
    name: 'create_lead',
    description: 'Create a new CRM lead (potential customer at the top of the pipeline).',
    input_schema: {
      type: 'object',
      properties: {
        name: strProp('Lead / prospect name.'),
        company: strProp('Company name (optional).'),
        email: strProp('Email address (optional).'),
        phone: strProp('Phone number (optional).'),
        source: strProp('Lead source, e.g. Website, Referral, Cold Call (optional).'),
        expectedValueSen: intProp('Expected deal value in sen (optional).'),
        notes: strProp('Notes about this lead (optional).'),
      },
      required: ['name'],
    },
  },
  {
    name: 'update_lead_status',
    description: 'Update the status of a lead. Call get_leads to find the lead ID first.',
    input_schema: {
      type: 'object',
      properties: {
        leadId: strProp('Lead UUID. Call get_leads to find this.'),
        status: enumProp('New status for the lead.', ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST']),
      },
      required: ['leadId', 'status'],
    },
  },
  {
    name: 'create_opportunity',
    description: 'Create a new sales opportunity in the CRM pipeline. Call get_contacts to find contactId if linking to a customer.',
    input_schema: {
      type: 'object',
      properties: {
        name: strProp('Opportunity name / title.'),
        contactId: strProp('Contact UUID (optional). Call get_contacts to find.'),
        stage: enumProp('Pipeline stage (optional, defaults to PROSPECTING).', [
          'PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST',
        ]),
        probability: numProp('Win probability as a percentage 0-100 (optional, defaults to 50).'),
        expectedValueSen: intProp('Expected deal value in sen (optional).'),
        expectedCloseDate: strProp('Expected close date in YYYY-MM-DD format (optional).'),
        notes: strProp('Notes (optional).'),
      },
      required: ['name'],
    },
  },
  {
    name: 'update_opportunity_stage',
    description: 'Update the pipeline stage of an opportunity. Call get_opportunities to find the opportunity ID first.',
    input_schema: {
      type: 'object',
      properties: {
        opportunityId: strProp('Opportunity UUID. Call get_opportunities to find.'),
        stage: enumProp('New pipeline stage.', [
          'PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST',
        ]),
      },
      required: ['opportunityId', 'stage'],
    },
  },
  {
    name: 'create_payroll_run',
    description: 'Create a new payroll run for a specific month and year. Only one run per month is allowed. The run starts in DRAFT status — the user should then go to Payroll to generate and approve it.',
    input_schema: {
      type: 'object',
      properties: {
        month: intProp('Month number 1-12.'),
        year: intProp('4-digit year, e.g. 2026.'),
        notes: strProp('Optional notes for this payroll run.'),
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'approve_leave_request',
    description: 'Approve a pending leave request. Always call get_leave_requests with status=PENDING first to find the correct request ID and confirm details with the user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        requestId: strProp('Leave request UUID. Call get_leave_requests with status=PENDING to find this.'),
      },
      required: ['requestId'],
    },
  },

  // ─── Additional read tools ────────────────────────────────────────────────
  {
    name: 'get_departments',
    description: 'List all departments with employee count. Returns department id, name, code, description, and active employee count.',
    input_schema: noParams(),
  },
  {
    name: 'get_warehouses',
    description: 'List all warehouses / storage locations. Returns warehouse id, name, code, city, state, and whether it is the default warehouse.',
    input_schema: noParams(),
  },
  {
    name: 'get_stock_movements',
    description: 'List stock movements (receive, issue, adjustments, transfers). Optionally filter by product or movement type.',
    input_schema: {
      type: 'object',
      properties: {
        productId: strProp('Filter by product UUID (optional). Call get_products to find this.'),
        type: enumProp('Filter by movement type (optional).', ['RECEIVE', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN']),
      },
    },
  },
  {
    name: 'get_leave_types',
    description: 'List all leave types configured for the company (e.g. Annual Leave, Medical Leave, Maternity Leave). Returns id, name, code, days per year, and whether it is paid.',
    input_schema: noParams(),
  },
  {
    name: 'get_leave_balances',
    description: 'Get leave balances for a specific employee for the current or specified year. Returns leave type name, entitled days, taken days, pending days, and remaining days. Call get_employees first to find the employeeId.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        year: intProp('Year (optional, defaults to current year).'),
      },
      required: ['employeeId'],
    },
  },
  {
    name: 'get_payroll_items',
    description: 'Get individual employee payroll items for a specific payroll run. Returns employee name, basic salary, gross salary, EPF, SOCSO, EIS, PCB, and net salary (all in sen). Call get_payroll_runs first to find the runId.',
    input_schema: {
      type: 'object',
      properties: {
        runId: strProp('Payroll run UUID. Call get_payroll_runs to find this.'),
      },
      required: ['runId'],
    },
  },

  // ─── Additional write tools ───────────────────────────────────────────────
  {
    name: 'update_employee',
    description: 'Update an existing employee\'s details. Call get_employees first to find the employee ID. Only provided fields are updated.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        fullName: strProp('Updated full name (optional).'),
        email: strProp('Updated email (optional).'),
        phone: strProp('Updated phone (optional).'),
        basicSalarySen: intProp('Updated basic salary in sen (optional). Multiply RM amount by 100.'),
        departmentId: strProp('Updated department UUID (optional).'),
        positionId: strProp('Updated position UUID (optional).'),
        employmentType: enumProp('Updated employment type (optional).', ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
        bankName: strProp('Bank name for salary payment (optional).'),
        bankAccountNumber: strProp('Bank account number (optional).'),
      },
      required: ['employeeId'],
    },
  },
  {
    name: 'update_employee_status',
    description: 'Change an employee\'s employment status (e.g. resign, terminate, suspend, reactivate). Call get_employees first to find the employee ID.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        status: enumProp('New employment status.', ['ACTIVE', 'PROBATION', 'RESIGNED', 'TERMINATED', 'SUSPENDED']),
        date: strProp('Effective date in YYYY-MM-DD format (required for RESIGNED or TERMINATED).'),
      },
      required: ['employeeId', 'status'],
    },
  },
  {
    name: 'record_payment',
    description: 'Record a payment received from a customer or made to a supplier. Call get_contacts to find contactId. Optionally link to an invoice with invoiceId.',
    input_schema: {
      type: 'object',
      properties: {
        type: enumProp('Payment direction.', ['RECEIVED', 'MADE']),
        contactId: strProp('Contact UUID. Call get_contacts to find this.'),
        date: strProp('Payment date in YYYY-MM-DD format.'),
        amountSen: intProp('Payment amount in sen. Multiply RM amount by 100.'),
        method: enumProp('Payment method (optional, defaults to BANK_TRANSFER).', ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'DUITNOW', 'TNG', 'GRABPAY', 'CARD']),
        reference: strProp('Reference number, e.g. cheque number or bank reference (optional).'),
        invoiceId: strProp('Invoice UUID to link this payment to (optional). Call get_invoices to find.'),
        notes: strProp('Notes (optional).'),
      },
      required: ['type', 'contactId', 'date', 'amountSen'],
    },
  },
  {
    name: 'create_product',
    description: 'Add a new product or service to the inventory catalog.',
    input_schema: {
      type: 'object',
      properties: {
        name: strProp('Product name.'),
        type: enumProp('Product type (optional, defaults to PRODUCT).', ['PRODUCT', 'SERVICE', 'BUNDLE']),
        sku: strProp('Stock keeping unit code (optional, auto-generated if omitted).'),
        sellingPriceSen: intProp('Selling price in sen (optional). Multiply RM amount by 100.'),
        costPriceSen: intProp('Cost price in sen (optional).'),
        unitOfMeasure: strProp('Unit of measure e.g. PCS, KG, LITRE (optional).'),
        trackInventory: {
          type: 'boolean' as const,
          description: 'Whether to track stock levels (optional, defaults to true for PRODUCT, false for SERVICE).',
        },
        reorderPoint: intProp('Stock level that triggers a low-stock alert (optional).'),
        description: strProp('Product description (optional).'),
      },
      required: ['name'],
    },
  },
  {
    name: 'record_stock_movement',
    description: 'Record stock in or out — receive new stock, issue stock, adjust quantities, or transfer between warehouses. Call get_products to find productId and get_warehouses to find warehouseId.',
    input_schema: {
      type: 'object',
      properties: {
        type: enumProp('Movement type.', ['RECEIVE', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN']),
        productId: strProp('Product UUID. Call get_products to find this.'),
        warehouseId: strProp('Source warehouse UUID. Call get_warehouses to find this.'),
        quantity: numProp('Quantity to move (positive number).'),
        unitCostSen: intProp('Unit cost in sen (optional, for RECEIVE movements).'),
        notes: strProp('Notes, e.g. reason for adjustment (optional).'),
        destWarehouseId: strProp('Destination warehouse UUID (required for TRANSFER_OUT).'),
      },
      required: ['type', 'productId', 'warehouseId', 'quantity'],
    },
  },
  {
    name: 'create_department',
    description: 'Create a new department in the HR structure.',
    input_schema: {
      type: 'object',
      properties: {
        name: strProp('Department name.'),
        code: strProp('Short department code e.g. IT, HR, FIN (optional).'),
        description: strProp('Description of the department (optional).'),
      },
      required: ['name'],
    },
  },
  {
    name: 'submit_leave_request',
    description: 'Submit a leave request on behalf of an employee. Call get_employees to find employeeId, and get_leave_types to find leaveTypeId.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        leaveTypeId: strProp('Leave type UUID. Call get_leave_types to find this.'),
        startDate: strProp('Leave start date in YYYY-MM-DD format.'),
        endDate: strProp('Leave end date in YYYY-MM-DD format.'),
        days: numProp('Number of leave days requested.'),
        reason: strProp('Reason for the leave (optional).'),
      },
      required: ['employeeId', 'leaveTypeId', 'startDate', 'endDate', 'days'],
    },
  },
  {
    name: 'reject_leave_request',
    description: 'Reject a pending leave request. Call get_leave_requests with status=PENDING first to find the request.',
    input_schema: {
      type: 'object',
      properties: {
        requestId: strProp('Leave request UUID. Call get_leave_requests with status=PENDING to find this.'),
        reason: strProp('Reason for rejection (optional but recommended).'),
      },
      required: ['requestId'],
    },
  },
  {
    name: 'generate_payroll_items',
    description: 'Generate payroll calculations for all active employees in a DRAFT payroll run. This auto-calculates EPF, SOCSO, EIS, and PCB for each employee. Call get_payroll_runs to find the runId.',
    input_schema: {
      type: 'object',
      properties: {
        runId: strProp('Payroll run UUID (must be in DRAFT status). Call get_payroll_runs to find this.'),
      },
      required: ['runId'],
    },
  },
  {
    name: 'approve_payroll_run',
    description: 'Approve a PROCESSING payroll run (after items have been generated). Call get_payroll_runs to find the runId.',
    input_schema: {
      type: 'object',
      properties: {
        runId: strProp('Payroll run UUID (must be in PROCESSING status). Call get_payroll_runs to find this.'),
      },
      required: ['runId'],
    },
  },
  {
    name: 'mark_payroll_paid',
    description: 'Mark an APPROVED payroll run as PAID (salaries have been disbursed). Call get_payroll_runs to find the runId.',
    input_schema: {
      type: 'object',
      properties: {
        runId: strProp('Payroll run UUID (must be in APPROVED status). Call get_payroll_runs to find this.'),
      },
      required: ['runId'],
    },
  },
  {
    name: 'create_quotation',
    description: 'Create a new quotation to send to a customer. Always call get_contacts first to find the contactId. Lines require description, quantity, and unit price in sen.',
    input_schema: {
      type: 'object',
      properties: {
        contactId: strProp('Contact UUID (customer). Call get_contacts to find this.'),
        issueDate: strProp('Quotation issue date in YYYY-MM-DD format.'),
        expiryDate: strProp('Quotation expiry date in YYYY-MM-DD format (optional).'),
        notes: strProp('Notes or remarks (optional).'),
        terms: strProp('Payment or delivery terms (optional).'),
        lines: strProp('JSON array string of line items. Each: {"description":"string","quantity":number,"unitPriceSen":number,"discountPercent":number,"sstRate":number}. Example: [{"description":"Website design","quantity":1,"unitPriceSen":500000}]'),
      },
      required: ['contactId', 'issueDate', 'lines'],
    },
  },
  {
    name: 'update_quotation_status',
    description: 'Update the status of a quotation (e.g. mark as SENT, ACCEPTED, REJECTED). Call get_quotations first to find the quotation ID.',
    input_schema: {
      type: 'object',
      properties: {
        quotationId: strProp('Quotation UUID. Call get_quotations to find this.'),
        status: enumProp('New status for the quotation.', ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
      },
      required: ['quotationId', 'status'],
    },
  },
  {
    name: 'convert_quotation_to_invoice',
    description: 'Convert an ACCEPTED quotation directly into a sales invoice. Call get_quotations to find the quotation ID. The invoice will be created in DRAFT status.',
    input_schema: {
      type: 'object',
      properties: {
        quotationId: strProp('Quotation UUID (must be ACCEPTED status). Call get_quotations to find this.'),
      },
      required: ['quotationId'],
    },
  },

  // ─── Holidays ──────────────────────────────────────────────────────────────
  {
    name: 'get_holidays',
    description: 'List public holidays for a given year. Returns holiday name, date, whether it is mandatory under Malaysian Employment Act, and state (if state-specific). Defaults to current year if no year provided.',
    input_schema: {
      type: 'object',
      properties: {
        year: intProp('Year to list holidays for (optional, defaults to current year).'),
      },
    },
  },
  {
    name: 'create_holiday',
    description: 'Add a public holiday to the calendar.',
    input_schema: {
      type: 'object',
      properties: {
        name: strProp('Holiday name, e.g. "Hari Raya Aidilfitri".'),
        date: strProp('Holiday date in YYYY-MM-DD format.'),
        isMandatory: { type: 'boolean' as const, description: 'Whether this is a mandatory gazetted holiday under Employment Act (optional, defaults to false).' },
        state: strProp('Malaysian state if state-specific, e.g. "Selangor" (optional, omit for national).'),
      },
      required: ['name', 'date'],
    },
  },
  {
    name: 'seed_holidays',
    description: 'Seed default Malaysian gazetted public holidays for a given year. Use this to quickly populate the holiday calendar with standard holidays.',
    input_schema: {
      type: 'object',
      properties: {
        year: intProp('Year to seed holidays for, e.g. 2026.'),
      },
      required: ['year'],
    },
  },

  // ─── Attendance / Work Entries ─────────────────────────────────────────────
  {
    name: 'get_work_entries',
    description: 'Get attendance/work entries for a specific employee within a date range. Returns date, normal hours, overtime hours, rest day hours, public holiday hours, absence and late flags, and notes.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        startDate: strProp('Start date in YYYY-MM-DD format.'),
        endDate: strProp('End date in YYYY-MM-DD format.'),
      },
      required: ['employeeId', 'startDate', 'endDate'],
    },
  },
  {
    name: 'get_monthly_attendance',
    description: 'Get all work entries for all employees for a specific month. Returns employee name, date, hours worked, OT, absences, and lates.',
    input_schema: {
      type: 'object',
      properties: {
        year: intProp('Year, e.g. 2026.'),
        month: intProp('Month number 1-12.'),
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_attendance_summary',
    description: 'Get a monthly attendance summary for a specific employee — total days worked, absences, lates, total normal/OT/rest day/PH hours, and calculated OT pay. Call get_employees first to find the employee ID.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        year: intProp('Year, e.g. 2026.'),
        month: intProp('Month number 1-12.'),
      },
      required: ['employeeId', 'year', 'month'],
    },
  },
  {
    name: 'record_work_entry',
    description: 'Record or update a daily attendance/work entry for an employee. If an entry already exists for the same employee+date, it will be updated.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        date: strProp('Work date in YYYY-MM-DD format.'),
        normalHours: numProp('Normal working hours (optional, defaults to 8).'),
        overtimeHours: numProp('Overtime hours at 1.5x rate (optional, defaults to 0).'),
        restDayHours: numProp('Rest day work hours at 2x rate (optional, defaults to 0).'),
        phHours: numProp('Public holiday work hours at 3x rate (optional, defaults to 0).'),
        isRestDay: { type: 'boolean' as const, description: 'Whether this date is a rest day (optional).' },
        isPublicHoliday: { type: 'boolean' as const, description: 'Whether this date is a public holiday (optional).' },
        isAbsent: { type: 'boolean' as const, description: 'Mark employee as absent (optional).' },
        isLate: { type: 'boolean' as const, description: 'Mark employee as late (optional).' },
        notes: strProp('Notes about this entry (optional).'),
      },
      required: ['employeeId', 'date'],
    },
  },

  // ─── Claims ────────────────────────────────────────────────────────────────
  {
    name: 'get_claim_types',
    description: 'List all configured expense claim types (e.g. Transport, Meals, Medical). Returns type id, name, code, whether receipt is required, taxable flag, and monthly limit (in sen).',
    input_schema: noParams(),
  },
  {
    name: 'get_claims',
    description: 'List expense claims. Optionally filter by employee or approval status. Returns claim number, employee name, claim date, total amount (in sen), status, and line items count.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Filter by employee UUID (optional). Call get_employees to find this.'),
        status: enumProp('Filter by claim status (optional).', ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID']),
      },
    },
  },
  {
    name: 'submit_claim',
    description: 'Submit an expense claim on behalf of an employee. Call get_employees to find employeeId and get_claim_types to find claim type IDs for line items.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        claimDate: strProp('Claim date in YYYY-MM-DD format.'),
        notes: strProp('Overall claim notes (optional).'),
        lines: strProp('JSON array of claim line items. Each: {"claimTypeId":"uuid","description":"string","amountSen":number,"date":"YYYY-MM-DD","receiptUrl":"string (optional)"}. Example: [{"claimTypeId":"uuid","description":"Grab to client meeting","amountSen":2500,"date":"2026-03-01"}]'),
      },
      required: ['employeeId', 'claimDate', 'lines'],
    },
  },
  {
    name: 'approve_claim',
    description: 'Approve a pending expense claim. Call get_claims with status=PENDING first to find the claim ID.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: strProp('Claim UUID. Call get_claims with status=PENDING to find this.'),
      },
      required: ['claimId'],
    },
  },
  {
    name: 'reject_claim',
    description: 'Reject a pending expense claim. Call get_claims with status=PENDING first to find the claim ID.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: strProp('Claim UUID. Call get_claims with status=PENDING to find this.'),
        reason: strProp('Reason for rejection (optional but recommended).'),
      },
      required: ['claimId'],
    },
  },

  // ─── Employment History & Termination ──────────────────────────────────────
  {
    name: 'get_employment_history',
    description: 'Get the employment history (job changes, promotions, transfers, salary changes) for a specific employee. Returns chronological list of changes with dates, departments, positions, salary, and reasons.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
      },
      required: ['employeeId'],
    },
  },
  {
    name: 'record_job_change',
    description: 'Record an employee job change — transfer, promotion, salary change, or demotion. This creates an immutable history record and updates the employee\'s current details.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        changeType: enumProp('Type of job change.', ['TRANSFER', 'PROMOTION', 'SALARY_CHANGE', 'DEMOTION']),
        effectiveDate: strProp('Effective date in YYYY-MM-DD format.'),
        departmentId: strProp('New department UUID (optional, for TRANSFER).'),
        positionId: strProp('New position UUID (optional, for PROMOTION).'),
        basicSalarySen: intProp('New basic salary in sen (optional, for SALARY_CHANGE). Multiply RM by 100.'),
        reason: strProp('Reason for the change (optional).'),
      },
      required: ['employeeId', 'changeType', 'effectiveDate'],
    },
  },
  {
    name: 'calculate_termination',
    description: 'Preview termination benefits for an employee WITHOUT actually terminating them. Returns notice period (weeks), notice pay, termination benefits, and total payout based on years of service. Use this to answer questions about termination costs.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        terminationDate: strProp('Proposed termination date in YYYY-MM-DD format.'),
      },
      required: ['employeeId', 'terminationDate'],
    },
  },
  {
    name: 'process_termination',
    description: 'Actually terminate an employee. Updates their status, records history, and calculates final pay (notice + termination benefits). This is irreversible — always call calculate_termination first to preview, then confirm with the user.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: strProp('Employee UUID. Call get_employees to find this.'),
        terminationDate: strProp('Termination date in YYYY-MM-DD format.'),
        reason: strProp('Reason for termination (optional).'),
      },
      required: ['employeeId', 'terminationDate'],
    },
  },
  {
    name: 'init_leave_balances',
    description: 'Initialize leave balances for all active employees for a specific year. Calculates tenure-based entitlements (Annual: 8/12/16 days, Sick: 14/18/22 days based on years of service) and handles carryover from previous year.',
    input_schema: {
      type: 'object',
      properties: {
        year: intProp('Year to initialize balances for, e.g. 2026.'),
      },
      required: ['year'],
    },
  },

  // ─── Accounting: Journals ──────────────────────────────────────────────────
  {
    name: 'get_journals',
    description: 'List journal entries. Optionally filter by status (DRAFT, POSTED, REVERSED). Returns entry number, date, description, source, status, and total debit/credit amounts in sen.',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter by journal entry status.', ['DRAFT', 'POSTED', 'REVERSED']),
      },
    },
  },
  {
    name: 'create_journal_entry',
    description: 'Create a manual journal entry. Lines must balance (total debits = total credits). Call get_accounts to find account IDs for the lines.',
    input_schema: {
      type: 'object',
      properties: {
        date: strProp('Journal entry date in YYYY-MM-DD format.'),
        description: strProp('Description of the journal entry.'),
        source: enumProp('Source of the entry (optional, defaults to MANUAL).', ['MANUAL', 'INVOICE', 'PAYMENT', 'PAYROLL', 'OTHER']),
        lines: strProp('JSON array of journal lines. Each: {"accountId":"uuid","description":"string (optional)","debitSen":number,"creditSen":number}. Debits must equal credits.'),
      },
      required: ['date', 'description', 'lines'],
    },
  },
  {
    name: 'post_journal_entry',
    description: 'Post a DRAFT journal entry to the general ledger. Once posted, the entry affects account balances and cannot be deleted.',
    input_schema: {
      type: 'object',
      properties: {
        journalId: strProp('Journal entry UUID. Call get_journals to find this.'),
      },
      required: ['journalId'],
    },
  },
  {
    name: 'reverse_journal_entry',
    description: 'Reverse a POSTED journal entry. Creates a new reversing entry that negates the original.',
    input_schema: {
      type: 'object',
      properties: {
        journalId: strProp('Journal entry UUID. Call get_journals to find this.'),
      },
      required: ['journalId'],
    },
  },

  // ─── Accounting: Bills (AP) ────────────────────────────────────────────────
  {
    name: 'get_bills',
    description: 'List vendor bills (accounts payable). Optionally filter by status. Returns bill number, supplier name, dates, total, paid, and balance amounts in sen.',
    input_schema: {
      type: 'object',
      properties: {
        status: enumProp('Filter by bill status.', ['DRAFT', 'APPROVED', 'PARTIAL', 'PAID', 'CANCELLED']),
      },
    },
  },
  {
    name: 'create_bill',
    description: 'Create a vendor bill. Call get_contacts with type=SUPPLIER first to find the contactId. Lines require description, quantity, and unit price in sen.',
    input_schema: {
      type: 'object',
      properties: {
        contactId: strProp('Supplier contact UUID. Call get_contacts with type=SUPPLIER to find this.'),
        billDate: strProp('Bill date in YYYY-MM-DD format.'),
        dueDate: strProp('Payment due date in YYYY-MM-DD format (optional).'),
        notes: strProp('Notes (optional).'),
        lines: strProp('JSON array of bill line items. Each: {"description":"string","quantity":number,"unitPriceSen":number,"discountPercent":number,"sstRate":number,"accountId":"uuid (optional)"}'),
      },
      required: ['contactId', 'billDate', 'lines'],
    },
  },
  {
    name: 'approve_bill',
    description: 'Approve a DRAFT bill for payment. Call get_bills to find the bill ID.',
    input_schema: {
      type: 'object',
      properties: {
        billId: strProp('Bill UUID. Call get_bills to find this.'),
      },
      required: ['billId'],
    },
  },
  {
    name: 'pay_bill',
    description: 'Record a payment against an APPROVED or PARTIAL bill. Creates a payment record and updates the bill balance.',
    input_schema: {
      type: 'object',
      properties: {
        billId: strProp('Bill UUID. Call get_bills to find this.'),
        amountSen: intProp('Payment amount in sen. Multiply RM amount by 100.'),
        date: strProp('Payment date in YYYY-MM-DD format.'),
        method: enumProp('Payment method (optional).', ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'DUITNOW', 'TNG', 'GRABPAY', 'CARD']),
        reference: strProp('Payment reference (optional).'),
      },
      required: ['billId', 'amountSen', 'date'],
    },
  },

  // ─── Accounting: Credit/Debit Notes ────────────────────────────────────────
  {
    name: 'create_credit_note',
    description: 'Create a Credit Note against an existing invoice. Reduces the customer\'s outstanding balance. Call get_invoices to find the invoice ID.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: strProp('Original invoice UUID. Call get_invoices to find this.'),
        reason: strProp('Reason for the credit note.'),
        lines: strProp('JSON array of credit note line items. Each: {"description":"string","quantity":number,"unitPriceSen":number,"discountPercent":number,"sstRate":number}'),
      },
      required: ['invoiceId', 'reason', 'lines'],
    },
  },
  {
    name: 'create_debit_note',
    description: 'Create a Debit Note against an existing invoice. Increases the customer\'s outstanding balance (for additional charges). Call get_invoices to find the invoice ID.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: strProp('Original invoice UUID. Call get_invoices to find this.'),
        reason: strProp('Reason for the debit note.'),
        lines: strProp('JSON array of debit note line items. Each: {"description":"string","quantity":number,"unitPriceSen":number,"discountPercent":number,"sstRate":number}'),
      },
      required: ['invoiceId', 'reason', 'lines'],
    },
  },

  // ─── Accounting: Financial Reports ─────────────────────────────────────────
  {
    name: 'get_trial_balance',
    description: 'Get the Trial Balance report as of a specific date. Returns each account with debit and credit balances, plus totals. Debits should equal credits for a balanced ledger.',
    input_schema: {
      type: 'object',
      properties: {
        asOfDate: strProp('As-of date in YYYY-MM-DD format.'),
      },
      required: ['asOfDate'],
    },
  },
  {
    name: 'get_profit_loss',
    description: 'Get the Profit & Loss (Income Statement) report for a date range. Shows revenue and expense accounts with amounts, and net profit/loss.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: strProp('Period start date in YYYY-MM-DD format.'),
        endDate: strProp('Period end date in YYYY-MM-DD format.'),
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_balance_sheet',
    description: 'Get the Balance Sheet report as of a specific date. Shows assets, liabilities, and equity with balances. Assets should equal Liabilities + Equity.',
    input_schema: {
      type: 'object',
      properties: {
        asOfDate: strProp('As-of date in YYYY-MM-DD format.'),
      },
      required: ['asOfDate'],
    },
  },
  {
    name: 'get_ar_aging',
    description: 'Get the Accounts Receivable Aging report. Shows outstanding invoice balances by customer, bucketed by age (current, 1-30, 31-60, 61-90, 90+ days).',
    input_schema: noParams(),
  },
  {
    name: 'get_ap_aging',
    description: 'Get the Accounts Payable Aging report. Shows outstanding bill balances by supplier, bucketed by age (current, 1-30, 31-60, 61-90, 90+ days).',
    input_schema: noParams(),
  },

  // ─── Accounting: Banking ───────────────────────────────────────────────────
  {
    name: 'get_bank_accounts',
    description: 'List all bank accounts registered in the system. Returns account name, bank name, account number, type, currency, and current balance in sen.',
    input_schema: noParams(),
  },
  {
    name: 'get_bank_transactions',
    description: 'List bank transactions for a specific bank account. Optionally filter by date range. Returns date, description, type, amount, matching status.',
    input_schema: {
      type: 'object',
      properties: {
        bankAccountId: strProp('Bank account UUID. Call get_bank_accounts to find this.'),
        startDate: strProp('Filter from date in YYYY-MM-DD format (optional).'),
        endDate: strProp('Filter to date in YYYY-MM-DD format (optional).'),
      },
      required: ['bankAccountId'],
    },
  },
  {
    name: 'create_bank_account',
    description: 'Create a new bank account record.',
    input_schema: {
      type: 'object',
      properties: {
        bankName: strProp('Bank name, e.g. Maybank, CIMB, RHB.'),
        accountName: strProp('Account name / label.'),
        accountNumber: strProp('Bank account number.'),
        accountType: enumProp('Account type (optional, defaults to CURRENT).', ['SAVINGS', 'CURRENT', 'FIXED_DEPOSIT']),
        currency: strProp('Currency code (optional, defaults to MYR).'),
        openingBalanceSen: intProp('Opening balance in sen (optional, defaults to 0).'),
      },
      required: ['bankName', 'accountName', 'accountNumber'],
    },
  },
  {
    name: 'create_bank_transaction',
    description: 'Manually create a bank transaction entry (for transactions not imported from bank statement).',
    input_schema: {
      type: 'object',
      properties: {
        bankAccountId: strProp('Bank account UUID. Call get_bank_accounts to find this.'),
        date: strProp('Transaction date in YYYY-MM-DD format.'),
        description: strProp('Transaction description.'),
        type: enumProp('Transaction type.', ['DEBIT', 'CREDIT']),
        amountSen: intProp('Transaction amount in sen. Multiply RM by 100.'),
        reference: strProp('Reference number (optional).'),
      },
      required: ['bankAccountId', 'date', 'description', 'type', 'amountSen'],
    },
  },
  {
    name: 'match_bank_transaction',
    description: 'Match a bank transaction to an existing payment record for reconciliation.',
    input_schema: {
      type: 'object',
      properties: {
        transactionId: strProp('Bank transaction UUID.'),
        paymentId: strProp('Payment UUID to match with.'),
      },
      required: ['transactionId', 'paymentId'],
    },
  },

  // ─── Accounting: Tax & Compliance ──────────────────────────────────────────
  {
    name: 'get_tax_codes',
    description: 'List all configured SST tax codes. Returns code, name, tax type (SERVICE/SALES), rate percentage, category, and effective dates.',
    input_schema: noParams(),
  },
  {
    name: 'seed_tax_codes',
    description: 'Seed default Malaysian SST tax codes (8% standard, 6% for F&B/Telecom/Parking/Logistics, plus exemptions). Use this to quickly set up the tax configuration.',
    input_schema: noParams(),
  },
  {
    name: 'get_compliance_dashboard',
    description: 'Get a summary of compliance obligations status — counts of overdue, due soon, upcoming, and completed obligations.',
    input_schema: noParams(),
  },
  {
    name: 'get_compliance_obligations',
    description: 'List compliance obligations with optional filters by year, month, or status.',
    input_schema: {
      type: 'object',
      properties: {
        year: intProp('Filter by year (optional).'),
        month: intProp('Filter by month 1-12 (optional).'),
        status: enumProp('Filter by status (optional).', ['UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED']),
      },
    },
  },
  {
    name: 'generate_monthly_obligations',
    description: 'Generate standard monthly statutory compliance obligations (EPF, SOCSO, EIS, PCB remittances) for a specific month.',
    input_schema: {
      type: 'object',
      properties: {
        year: intProp('Year, e.g. 2026.'),
        month: intProp('Month number 1-12.'),
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'complete_compliance_obligation',
    description: 'Mark a compliance obligation as completed (e.g. after submitting EPF or filing SST return).',
    input_schema: {
      type: 'object',
      properties: {
        obligationId: strProp('Compliance obligation UUID.'),
      },
      required: ['obligationId'],
    },
  },

  // ─── E-Invoice (MyInvois / LHDN) ──────────────────────────────────────────
  {
    name: 'get_einvoice_status',
    description: 'Get the e-invoice (MyInvois) submission status for an invoice. Returns status (NOT_SUBMITTED, PENDING, VALID, INVALID, CANCELLED), UUID, validation URL, and any errors.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: strProp('Invoice UUID. Call get_invoices to find this.'),
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'submit_einvoice',
    description: 'Submit an invoice to LHDN MyInvois for e-invoicing. The invoice must be in SENT, PARTIAL, OVERDUE, or PAID status. Requires MyInvois credentials configured in Settings > E-Invoice.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: strProp('Invoice UUID to submit.'),
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'cancel_einvoice',
    description: 'Cancel a validated e-invoice on LHDN MyInvois. Only VALID e-invoices can be cancelled (within 72 hours of validation).',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: strProp('Invoice UUID to cancel.'),
      },
      required: ['invoiceId'],
    },
  },
]

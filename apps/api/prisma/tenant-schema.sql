-- Tenant Schema Template
-- This SQL is executed when a new tenant is created
-- Replace {{SCHEMA}} with the actual tenant schema name (e.g., tenant_abc123)

CREATE SCHEMA IF NOT EXISTS "{{SCHEMA}}";

-- ─────────────────────────────────────────────
-- ACCOUNTING MODULE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  sub_type VARCHAR(100),
  parent_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  is_system BOOLEAN DEFAULT FALSE, -- system accounts cannot be deleted
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no VARCHAR(50) NOT NULL UNIQUE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(255),
  source_type VARCHAR(50), -- INVOICE, PAYMENT, PAYROLL, MANUAL, etc.
  source_id UUID,
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, POSTED, CANCELLED
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES "{{SCHEMA}}".journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES "{{SCHEMA}}".accounts(id),
  description TEXT,
  debit_sen BIGINT NOT NULL DEFAULT 0,  -- stored in sen (1 MYR = 100 sen)
  credit_sen BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'MYR',
  exchange_rate DECIMAL(10, 6) DEFAULT 1.000000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- CUSTOMER, SUPPLIER, BOTH
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  ic_no VARCHAR(20), -- IC number for individuals
  reg_no VARCHAR(50), -- SSM/company reg for businesses
  tax_id VARCHAR(50), -- SST/income tax number
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postcode VARCHAR(10),
  country VARCHAR(2) DEFAULT 'MY',
  ar_account_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  ap_account_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  payment_terms INT DEFAULT 30, -- days
  credit_limit_sen BIGINT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL, -- INVOICE, CREDIT_NOTE, DEBIT_NOTE
  contact_id UUID NOT NULL REFERENCES "{{SCHEMA}}".contacts(id),
  issue_date DATE NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SENT, PARTIAL, PAID, OVERDUE, CANCELLED
  currency VARCHAR(3) DEFAULT 'MYR',
  exchange_rate DECIMAL(10, 6) DEFAULT 1.000000,
  subtotal_sen BIGINT NOT NULL DEFAULT 0,
  sst_amount_sen BIGINT NOT NULL DEFAULT 0,
  discount_sen BIGINT NOT NULL DEFAULT 0,
  total_sen BIGINT NOT NULL DEFAULT 0,
  paid_sen BIGINT NOT NULL DEFAULT 0,
  balance_sen BIGINT NOT NULL DEFAULT 0,
  sst_type VARCHAR(20), -- SERVICE, SALES, EXEMPT, NULL
  sst_rate DECIMAL(5, 2),
  notes TEXT,
  terms TEXT,
  myinvois_id VARCHAR(255), -- LHDN e-invoice UUID
  myinvois_status VARCHAR(50), -- VALID, INVALID, CANCELLED
  myinvois_qr TEXT, -- QR code data
  myinvois_submitted_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES "{{SCHEMA}}".invoices(id) ON DELETE CASCADE,
  product_id UUID,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 4) NOT NULL,
  unit_price_sen BIGINT NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  subtotal_sen BIGINT NOT NULL,
  sst_rate DECIMAL(5, 2) DEFAULT 0,
  sst_amount_sen BIGINT DEFAULT 0,
  total_sen BIGINT NOT NULL,
  account_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL, -- RECEIVED, MADE
  contact_id UUID NOT NULL REFERENCES "{{SCHEMA}}".contacts(id),
  date DATE NOT NULL,
  amount_sen BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'MYR',
  method VARCHAR(50), -- CASH, BANK_TRANSFER, CHEQUE, DUITNOW, TNG, GRABPAY, CARD
  reference VARCHAR(255),
  bank_account_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES "{{SCHEMA}}".payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES "{{SCHEMA}}".invoices(id) ON DELETE CASCADE,
  amount_sen BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INVENTORY MODULE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES "{{SCHEMA}}".product_categories(id),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'PRODUCT', -- PRODUCT, SERVICE, BUNDLE
  category_id UUID REFERENCES "{{SCHEMA}}".product_categories(id),
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  cost_price_sen BIGINT DEFAULT 0,
  selling_price_sen BIGINT DEFAULT 0,
  sst_type VARCHAR(20), -- SERVICE, SALES, EXEMPT
  sst_rate DECIMAL(5, 2) DEFAULT 0,
  income_account_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  expense_account_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  inventory_account_id UUID REFERENCES "{{SCHEMA}}".accounts(id),
  track_inventory BOOLEAN DEFAULT TRUE,
  reorder_point DECIMAL(10, 4) DEFAULT 0,
  reorder_quantity DECIMAL(10, 4) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_sold BOOLEAN DEFAULT TRUE,
  is_purchased BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES "{{SCHEMA}}".products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES "{{SCHEMA}}".warehouses(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 4) DEFAULT 0,
  reserved_quantity DECIMAL(10, 4) DEFAULT 0,
  average_cost_sen BIGINT DEFAULT 0, -- for weighted average costing
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_no VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL, -- RECEIVE, ISSUE, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, SALE, RETURN
  product_id UUID NOT NULL REFERENCES "{{SCHEMA}}".products(id),
  warehouse_id UUID NOT NULL REFERENCES "{{SCHEMA}}".warehouses(id),
  dest_warehouse_id UUID REFERENCES "{{SCHEMA}}".warehouses(id), -- for transfers
  quantity DECIMAL(10, 4) NOT NULL,
  unit_cost_sen BIGINT DEFAULT 0,
  total_cost_sen BIGINT DEFAULT 0,
  reference_type VARCHAR(50), -- PURCHASE_ORDER, INVOICE, MANUAL, POS_SALE
  reference_id UUID,
  notes TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- ─────────────────────────────────────────────
-- HR MODULE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  description TEXT,
  parent_id UUID REFERENCES "{{SCHEMA}}".departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES "{{SCHEMA}}".departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no VARCHAR(20) UNIQUE,
  -- Personal info
  full_name VARCHAR(100) NOT NULL,
  ic_number VARCHAR(20),
  passport_number VARCHAR(30),
  date_of_birth DATE,
  gender VARCHAR(10), -- MALE, FEMALE, OTHER
  nationality VARCHAR(50) DEFAULT 'Malaysian',
  race VARCHAR(50),
  religion VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(20),
  -- Address
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(50),
  postcode VARCHAR(10),
  country VARCHAR(2) DEFAULT 'MY',
  -- Employment
  department_id UUID REFERENCES "{{SCHEMA}}".departments(id),
  position_id UUID REFERENCES "{{SCHEMA}}".positions(id),
  employment_type VARCHAR(20) DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, CONTRACT, INTERN
  hire_date DATE NOT NULL,
  probation_end_date DATE,
  resignation_date DATE,
  termination_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PROBATION, RESIGNED, TERMINATED, SUSPENDED
  -- Compensation
  basic_salary_sen BIGINT DEFAULT 0, -- stored in sen
  -- Bank details
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(30),
  -- Statutory numbers
  epf_number VARCHAR(20),
  socso_number VARCHAR(20),
  income_tax_number VARCHAR(20),
  -- Payroll flags
  epf_opted_out BOOLEAN DEFAULT FALSE,
  socso_opted_out BOOLEAN DEFAULT FALSE,
  eis_opted_out BOOLEAN DEFAULT FALSE,
  -- Emergency contact
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  days_per_year DECIMAL(5,1) DEFAULT 0,
  is_paid BOOLEAN DEFAULT TRUE,
  requires_document BOOLEAN DEFAULT FALSE,
  carryover_days DECIMAL(5,1) DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES "{{SCHEMA}}".employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES "{{SCHEMA}}".leave_types(id),
  year INTEGER NOT NULL,
  entitled_days DECIMAL(5,1) DEFAULT 0,
  taken_days DECIMAL(5,1) DEFAULT 0,
  pending_days DECIMAL(5,1) DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES "{{SCHEMA}}".employees(id),
  leave_type_id UUID NOT NULL REFERENCES "{{SCHEMA}}".leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(5,1) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month INTEGER NOT NULL, -- 1-12
  period_year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PROCESSING, APPROVED, PAID
  employee_count INTEGER DEFAULT 0,
  total_gross_sen BIGINT DEFAULT 0,
  total_net_sen BIGINT DEFAULT 0,
  total_epf_employee_sen BIGINT DEFAULT 0,
  total_epf_employer_sen BIGINT DEFAULT 0,
  total_socso_employee_sen BIGINT DEFAULT 0,
  total_socso_employer_sen BIGINT DEFAULT 0,
  total_eis_employee_sen BIGINT DEFAULT 0,
  total_eis_employer_sen BIGINT DEFAULT 0,
  total_pcb_sen BIGINT DEFAULT 0,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(period_month, period_year)
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES "{{SCHEMA}}".payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES "{{SCHEMA}}".employees(id),
  -- Working days
  working_days INTEGER DEFAULT 0,
  days_worked INTEGER DEFAULT 0,
  -- Earnings (in sen)
  basic_salary_sen BIGINT DEFAULT 0,
  allowances_sen BIGINT DEFAULT 0,
  overtime_sen BIGINT DEFAULT 0,
  bonus_sen BIGINT DEFAULT 0,
  gross_salary_sen BIGINT DEFAULT 0,
  -- Employee deductions (in sen)
  epf_employee_sen BIGINT DEFAULT 0,
  socso_employee_sen BIGINT DEFAULT 0,
  eis_employee_sen BIGINT DEFAULT 0,
  pcb_sen BIGINT DEFAULT 0,
  other_deductions_sen BIGINT DEFAULT 0,
  -- Employer contributions (in sen)
  epf_employer_sen BIGINT DEFAULT 0,
  socso_employer_sen BIGINT DEFAULT 0,
  eis_employer_sen BIGINT DEFAULT 0,
  -- Net
  net_salary_sen BIGINT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, employee_id)
);

-- ─────────────────────────────────────────────
-- CRM MODULE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  source VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  expected_value_sen BIGINT DEFAULT 0,
  notes TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES "{{SCHEMA}}".leads(id),
  contact_id UUID REFERENCES "{{SCHEMA}}".contacts(id),
  name VARCHAR(255) NOT NULL,
  stage VARCHAR(30) NOT NULL DEFAULT 'PROSPECTING',
  probability SMALLINT DEFAULT 50,
  expected_value_sen BIGINT DEFAULT 0,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no VARCHAR(50) NOT NULL UNIQUE,
  contact_id UUID NOT NULL REFERENCES "{{SCHEMA}}".contacts(id),
  opportunity_id UUID REFERENCES "{{SCHEMA}}".opportunities(id),
  issue_date DATE NOT NULL,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  currency VARCHAR(3) DEFAULT 'MYR',
  subtotal_sen BIGINT NOT NULL DEFAULT 0,
  sst_amount_sen BIGINT NOT NULL DEFAULT 0,
  total_sen BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".quotation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES "{{SCHEMA}}".quotations(id) ON DELETE CASCADE,
  product_id UUID,
  description TEXT NOT NULL,
  quantity DECIMAL(10,4) NOT NULL,
  unit_price_sen BIGINT NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  subtotal_sen BIGINT NOT NULL,
  sst_rate DECIMAL(5,2) DEFAULT 0,
  sst_amount_sen BIGINT DEFAULT 0,
  total_sen BIGINT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AUDIT LOG (every tenant schema has this)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, INVITE, TOGGLE, etc.
  entity_type VARCHAR(100) NOT NULL, -- e.g., invoice, product, employee
  entity_id VARCHAR(255),
  details JSONB, -- extra context (old/new values, metadata)
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON "{{SCHEMA}}".journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON "{{SCHEMA}}".journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON "{{SCHEMA}}".invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON "{{SCHEMA}}".invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON "{{SCHEMA}}".invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON "{{SCHEMA}}".invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_payments_contact ON "{{SCHEMA}}".payments(contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON "{{SCHEMA}}".payments(date);
CREATE INDEX IF NOT EXISTS idx_products_sku ON "{{SCHEMA}}".products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON "{{SCHEMA}}".products(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON "{{SCHEMA}}".stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON "{{SCHEMA}}".stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "{{SCHEMA}}".audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON "{{SCHEMA}}".audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON "{{SCHEMA}}".audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_employees_status ON "{{SCHEMA}}".employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON "{{SCHEMA}}".employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON "{{SCHEMA}}".employees(hire_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON "{{SCHEMA}}".leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON "{{SCHEMA}}".leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON "{{SCHEMA}}".leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON "{{SCHEMA}}".payroll_runs(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON "{{SCHEMA}}".payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON "{{SCHEMA}}".payroll_items(employee_id);

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaService } from './prisma.service'

@Injectable()
export class TenantSchemaService implements OnModuleInit {
  private readonly logger = new Logger(TenantSchemaService.name)
  private readonly schemaTemplate: string

  constructor(private readonly prisma: PrismaService) {
    // Load SQL template at startup
    this.schemaTemplate = readFileSync(
      join(__dirname, '../../prisma/tenant-schema.sql'),
      'utf-8',
    )
  }

  /**
   * On startup, migrate all existing tenant schemas to add any missing tables.
   * This handles tenants created before new modules (e.g. CRM) were added.
   */
  async onModuleInit() {
    await this.migrateExistingTenants()
  }

  /**
   * Adds missing tables to all existing tenant schemas.
   * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
   */
  async migrateExistingTenants(): Promise<void> {
    this.logger.log('Running tenant schema migrations...')
    try {
      const tenants = await this.prisma.$queryRawUnsafe<{ schema: string }[]>(
        `SELECT "schema" FROM public.tenants WHERE "schema" IS NOT NULL`,
      )
      for (const tenant of tenants) {
        await this.migrateAllTables(tenant.schema)
        await this.migrateAuditLogsColumns(tenant.schema)
      }
      this.logger.log(`Tenant migrations complete for ${tenants.length} tenant(s)`)
    } catch (err) {
      this.logger.error('Tenant migration failed', err)
    }
  }

  /**
   * Ensures audit_logs table has the correct columns (v2 schema).
   * Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS.
   */
  private async migrateAuditLogsColumns(schemaName: string): Promise<void> {
    const stmts = [
      `ALTER TABLE "${schemaName}".audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)`,
      `ALTER TABLE "${schemaName}".audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`,
      `ALTER TABLE "${schemaName}".audit_logs ADD COLUMN IF NOT EXISTS details JSONB`,
      `ALTER TABLE "${schemaName}".audit_logs DROP COLUMN IF EXISTS old_values`,
      `ALTER TABLE "${schemaName}".audit_logs DROP COLUMN IF EXISTS new_values`,
      `ALTER TABLE "${schemaName}".audit_logs DROP COLUMN IF EXISTS user_agent`,
    ]
    for (const stmt of stmts) {
      await this.prisma.$executeRawUnsafe(stmt)
    }
  }

  /**
   * Runs the full schema template against an existing tenant schema.
   * All CREATE TABLE statements use IF NOT EXISTS, so this is safe to run
   * on schemas that already have some tables — only missing ones are added.
   */
  private async migrateAllTables(schemaName: string): Promise<void> {
    const sql = this.schemaTemplate.replace(/\{\{SCHEMA\}\}/g, schemaName)
    const statements = sql
      .split(';')
      .map((s) =>
        s
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter((s) => s.length > 0)

    for (const statement of statements) {
      await this.prisma.$executeRawUnsafe(statement)
    }
  }

  /**
   * Creates a new PostgreSQL schema for a tenant and runs all table migrations
   */
  async createTenantSchema(schemaName: string): Promise<void> {
    this.logger.log(`Creating schema for tenant: ${schemaName}`)

    // Replace placeholder with actual schema name
    const sql = this.schemaTemplate.replace(/\{\{SCHEMA\}\}/g, schemaName)

    // Prisma doesn't support multiple statements in one call — split and execute each
    // Strip comment-only lines from each block before checking if it has real SQL
    const statements = sql
      .split(';')
      .map((s) =>
        s
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter((s) => s.length > 0)

    for (const statement of statements) {
      await this.prisma.$executeRawUnsafe(statement)
    }

    // Seed default data
    await this.seedDefaultChartOfAccounts(schemaName)
    await this.seedDefaultLeaveTypes(schemaName)

    this.logger.log(`Schema created successfully: ${schemaName}`)
  }

  /**
   * Drops a tenant's schema (DANGER: irreversible)
   * Only used for account deletion with user consent
   */
  async dropTenantSchema(schemaName: string): Promise<void> {
    this.logger.warn(`Dropping schema: ${schemaName}`)
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
  }

  /**
   * Execute a raw query in a specific tenant's schema
   */
  async executeTenantQuery<T>(schemaName: string, query: string, params: unknown[] = []): Promise<T[]> {
    // Set search_path to tenant schema for this transaction
    const results = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}", public`)
      return tx.$queryRawUnsafe<T[]>(query, ...params)
    })
    return results
  }

  /**
   * Seeds the Malaysian default chart of accounts for a new tenant
   */
  private async seedDefaultChartOfAccounts(schemaName: string): Promise<void> {
    const accounts = this.getMalaysianChartOfAccounts()

    for (const account of accounts) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".accounts (code, name, type, sub_type, is_system)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING`,
        account.code,
        account.name,
        account.type,
        account.subType,
        true,
      )
    }
  }

  /**
   * Seeds Malaysian statutory default leave types for a new tenant
   */
  private async seedDefaultLeaveTypes(schemaName: string): Promise<void> {
    const leaveTypes = [
      { name: 'Annual Leave',          code: 'AL',  daysPerYear: 14, isPaid: true,  requiresDoc: false, isSystem: true },
      { name: 'Medical Leave',         code: 'MC',  daysPerYear: 14, isPaid: true,  requiresDoc: true,  isSystem: true },
      { name: 'Hospitalisation Leave', code: 'HL',  daysPerYear: 60, isPaid: true,  requiresDoc: true,  isSystem: true },
      { name: 'Maternity Leave',       code: 'MAT', daysPerYear: 98, isPaid: true,  requiresDoc: true,  isSystem: true },
      { name: 'Paternity Leave',       code: 'PAT', daysPerYear: 7,  isPaid: true,  requiresDoc: false, isSystem: true },
      { name: 'Emergency Leave',       code: 'EL',  daysPerYear: 3,  isPaid: true,  requiresDoc: false, isSystem: false },
      { name: 'Unpaid Leave',          code: 'UL',  daysPerYear: 0,  isPaid: false, requiresDoc: false, isSystem: false },
    ]

    for (const lt of leaveTypes) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".leave_types (name, code, days_per_year, is_paid, requires_document, is_system)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        lt.name,
        lt.code,
        lt.daysPerYear,
        lt.isPaid,
        lt.requiresDoc,
        lt.isSystem,
      )
    }
  }

  /**
   * Malaysian standard chart of accounts
   * Based on MASB (Malaysian Accounting Standards Board) guidelines
   */
  private getMalaysianChartOfAccounts() {
    return [
      // ── ASSETS ──
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1010', name: 'Petty Cash', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1020', name: 'Bank — Current Account', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1030', name: 'Bank — Savings Account', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1110', name: 'Other Receivables', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1200', name: 'Inventory', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1400', name: 'SST Claimable', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1500', name: 'Property, Plant & Equipment', type: 'ASSET', subType: 'FIXED_ASSET' },
      { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET', subType: 'FIXED_ASSET' },
      { code: '1600', name: 'Deposits', type: 'ASSET', subType: 'OTHER_ASSET' },

      // ── LIABILITIES ──
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2010', name: 'Other Payables & Accruals', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2100', name: 'SST Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2110', name: 'Service Tax Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2120', name: 'Sales Tax Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2200', name: 'EPF Payable (Employer)', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2210', name: 'EPF Payable (Employee)', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2220', name: 'SOCSO Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2230', name: 'EIS Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2240', name: 'PCB/MTD Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2300', name: 'Salaries Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2400', name: 'Short-term Loans', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2500', name: 'Long-term Loans', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY' },

      // ── EQUITY ──
      { code: '3000', name: "Owner's Capital / Share Capital", type: 'EQUITY', subType: 'EQUITY' },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', subType: 'EQUITY' },
      { code: '3200', name: 'Current Year Earnings', type: 'EQUITY', subType: 'EQUITY' },
      { code: '3300', name: "Owner's Drawings", type: 'EQUITY', subType: 'EQUITY' },

      // ── REVENUE ──
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4010', name: 'Service Revenue', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4100', name: 'Sales Discounts', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4200', name: 'Other Income', type: 'REVENUE', subType: 'OTHER_REVENUE' },
      { code: '4210', name: 'Interest Income', type: 'REVENUE', subType: 'OTHER_REVENUE' },

      // ── EXPENSES ──
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', subType: 'COST_OF_SALES' },
      { code: '5100', name: 'Salaries & Wages', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5110', name: 'EPF Contribution (Employer)', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5120', name: 'SOCSO Contribution (Employer)', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5130', name: 'EIS Contribution (Employer)', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5200', name: 'Rental Expense', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5210', name: 'Utilities', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5220', name: 'Telephone & Internet', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5300', name: 'Advertising & Marketing', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5400', name: 'Office Supplies', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5500', name: 'Depreciation Expense', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5600', name: 'Bank Charges', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5700', name: 'Professional Fees', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5800', name: 'Travel & Entertainment', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5900', name: 'Income Tax Expense', type: 'EXPENSE', subType: 'TAX_EXPENSE' },
      { code: '5999', name: 'Miscellaneous Expense', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
    ]
  }
}

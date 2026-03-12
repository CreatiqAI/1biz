import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ContentBlockParam, ToolResultBlockParam, Message } from '@anthropic-ai/sdk/resources/messages'
import { AuditService } from '../audit/audit.service'
import { InvoicesService } from '../accounting/invoices.service'
import { PaymentsService } from '../accounting/payments.service'
import { ContactsService } from '../accounting/contacts.service'
import { ProductsService } from '../inventory/products.service'
import { WarehousesService } from '../inventory/warehouses.service'
import { StockService } from '../inventory/stock.service'
import { DepartmentsService } from '../hr/departments/departments.service'
import { EmployeesService } from '../hr/employees/employees.service'
import { LeaveService } from '../hr/leave/leave.service'
import { PayrollService } from '../hr/payroll/payroll.service'
import { HolidaysService } from '../hr/holidays/holidays.service'
import { AttendanceService } from '../hr/attendance/attendance.service'
import { ClaimsService } from '../hr/claims/claims.service'
import { LeadsService } from '../crm/leads.service'
import { OpportunitiesService } from '../crm/opportunities.service'
import { QuotationsService } from '../crm/quotations.service'
import { JournalsService } from '../accounting/journals.service'
import { BillsService } from '../accounting/bills.service'
import { ReportsService } from '../accounting/reports.service'
import { BankingService } from '../accounting/banking.service'
import { TaxService } from '../accounting/tax.service'
import { ComplianceService } from '../accounting/compliance.service'
import { DashboardService } from '../dashboard/dashboard.service'
import { CHAT_TOOLS, ToolName } from './chat-tools'
import { buildSystemPrompt } from './chat-system-prompt'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestDto {
  message: string
  history: ChatMessage[]
}

// Safely convert an unknown tool input value to string | undefined
function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  return String(v)
}

// Prisma $queryRawUnsafe can return BigInt — convert before JSON-serializing
function safeStringify(data: unknown): unknown {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? Number(value) : value,
    ),
  )
}

// Parse a payload that may be a JSON string or already an object (Claude sends objects)
function parsePayload(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return {}
}

@Injectable()
export class ChatService {
  private readonly anthropic: Anthropic
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
    private readonly contactsService: ContactsService,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
    private readonly stockService: StockService,
    private readonly departmentsService: DepartmentsService,
    private readonly employeesService: EmployeesService,
    private readonly leaveService: LeaveService,
    private readonly payrollService: PayrollService,
    private readonly holidaysService: HolidaysService,
    private readonly attendanceService: AttendanceService,
    private readonly claimsService: ClaimsService,
    private readonly leadsService: LeadsService,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly quotationsService: QuotationsService,
    private readonly journalsService: JournalsService,
    private readonly billsService: BillsService,
    private readonly reportsService: ReportsService,
    private readonly bankingService: BankingService,
    private readonly taxService: TaxService,
    private readonly complianceService: ComplianceService,
    private readonly dashboardService: DashboardService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    })
  }

  /** Call Anthropic API with timeout + automatic retry on overload/rate-limit */
  private async callAnthropic(
    params: Anthropic.MessageCreateParamsNonStreaming,
  ): Promise<Message> {
    const MAX_RETRIES = 3
    const TIMEOUT_MS = 60_000 // 60s per API call
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await Promise.race([
          this.anthropic.messages.create(params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Anthropic API timeout (60s)')), TIMEOUT_MS),
          ),
        ]) as Message
        return result
      } catch (err: any) {
        const status = err?.status ?? err?.statusCode
        const isRetryable = status === 429 || status === 529 || status === 503
        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = attempt * 2000 // 2s, 4s
          this.logger.warn(`Anthropic ${status} on attempt ${attempt}, retrying in ${delay}ms...`)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
        throw err
      }
    }
    throw new Error('Unreachable')
  }

  /** Friendly labels for tool names shown to the user during SSE streaming */
  private toolLabel(name: string): string {
    const map: Record<string, string> = {
      get_dashboard_stats: 'Checking dashboard stats',
      get_invoices: 'Looking up invoices',
      get_payments: 'Looking up payments',
      get_contacts: 'Looking up contacts',
      get_products: 'Looking up products',
      get_low_stock: 'Checking low stock items',
      get_employees: 'Looking up employees',
      get_departments: 'Looking up departments',
      get_warehouses: 'Looking up warehouses',
      get_stock_movements: 'Checking stock movements',
      get_leave_types: 'Looking up leave types',
      get_leave_balances: 'Checking leave balances',
      get_leave_requests: 'Looking up leave requests',
      get_payroll_runs: 'Looking up payroll runs',
      get_payroll_items: 'Looking up payroll items',
      get_leads: 'Looking up leads',
      get_opportunities: 'Looking up opportunities',
      get_quotations: 'Looking up quotations',
      confirm_action: 'Preparing confirmation',
      execute_confirmed_action: 'Executing action',
      create_employee: 'Creating employee',
      update_employee: 'Updating employee',
      create_contact: 'Creating contact',
      create_invoice: 'Creating invoice',
      update_invoice_status: 'Updating invoice',
      record_payment: 'Recording payment',
      create_product: 'Creating product',
      record_stock_movement: 'Recording stock movement',
      create_department: 'Creating department',
      submit_leave_request: 'Submitting leave request',
      approve_leave_request: 'Approving leave request',
      reject_leave_request: 'Rejecting leave request',
      create_payroll_run: 'Creating payroll run',
      generate_payroll_items: 'Generating payroll items',
      approve_payroll_run: 'Approving payroll',
      mark_payroll_paid: 'Marking payroll as paid',
      create_lead: 'Creating lead',
      update_lead_status: 'Updating lead',
      create_opportunity: 'Creating opportunity',
      update_opportunity_stage: 'Updating opportunity',
      create_quotation: 'Creating quotation',
      update_quotation_status: 'Updating quotation',
      convert_quotation_to_invoice: 'Converting quotation to invoice',
      get_holidays: 'Looking up public holidays',
      create_holiday: 'Creating public holiday',
      seed_holidays: 'Seeding public holidays',
      get_work_entries: 'Looking up work entries',
      get_monthly_attendance: 'Looking up monthly attendance',
      get_attendance_summary: 'Checking attendance summary',
      record_work_entry: 'Recording work entry',
      get_claim_types: 'Looking up claim types',
      get_claims: 'Looking up claims',
      submit_claim: 'Submitting claim',
      approve_claim: 'Approving claim',
      reject_claim: 'Rejecting claim',
      get_employment_history: 'Looking up employment history',
      record_job_change: 'Recording job change',
      calculate_termination: 'Calculating termination benefits',
      process_termination: 'Processing termination',
      init_leave_balances: 'Initializing leave balances',
      get_journals: 'Looking up journal entries',
      get_bills: 'Looking up bills',
      get_trial_balance: 'Generating trial balance',
      get_profit_loss: 'Generating P&L report',
      get_balance_sheet: 'Generating balance sheet',
      get_ar_aging: 'Generating AR aging report',
      get_ap_aging: 'Generating AP aging report',
      get_bank_accounts: 'Looking up bank accounts',
      get_bank_transactions: 'Looking up bank transactions',
      get_tax_codes: 'Looking up tax codes',
      get_compliance_dashboard: 'Checking compliance status',
      get_compliance_obligations: 'Looking up compliance obligations',
      create_journal_entry: 'Creating journal entry',
      post_journal_entry: 'Posting journal entry',
      reverse_journal_entry: 'Reversing journal entry',
      create_bill: 'Creating bill',
      approve_bill: 'Approving bill',
      pay_bill: 'Recording bill payment',
      create_credit_note: 'Creating credit note',
      create_debit_note: 'Creating debit note',
      create_bank_account: 'Creating bank account',
      create_bank_transaction: 'Creating bank transaction',
      match_bank_transaction: 'Matching bank transaction',
      seed_tax_codes: 'Seeding tax codes',
      generate_monthly_obligations: 'Generating monthly obligations',
      complete_compliance_obligation: 'Completing compliance obligation',
    }
    return map[name] || 'Processing'
  }

  async chat(
    tenantSchema: string,
    userId: string,
    tenantId: string,
    dto: ChatRequestDto,
    onStatus?: (text: string) => void,
  ): Promise<string> {
    const emit = onStatus ?? (() => {})

    try {
      // Build messages array from history + current message
      const messages: MessageParam[] = [
        ...dto.history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: dto.message },
      ]

      // Agentic loop: execute tool calls until Claude stops requesting them
      const MAX_TURNS = 8
      let turn = 0
      const startTime = Date.now()

      while (turn < MAX_TURNS) {
        const turnStart = Date.now()
        this.logger.log(`[Chat] Turn ${turn} — calling Anthropic (messages: ${messages.length})...`)
        emit('Thinking...')

        const response = await this.callAnthropic({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: buildSystemPrompt(),
          tools: CHAT_TOOLS,
          messages,
        })

        this.logger.log(`[Chat] Turn ${turn} — Anthropic responded in ${Date.now() - turnStart}ms, stop=${response.stop_reason}`)

        // Check if Claude wants to use tools
        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

        if (toolUseBlocks.length === 0) {
          // No tool calls — extract the text response
          const textBlocks = response.content.filter((b) => b.type === 'text')
          this.logger.log(`[Chat] Done in ${Date.now() - startTime}ms (${turn} tool turns)`)
          return textBlocks.map((b) => (b as any).text).join('\n') || 'I was unable to generate a response.'
        }

        turn++

        // Add assistant's response (with tool_use blocks) to messages
        messages.push({ role: 'assistant', content: response.content })

        // Emit status for each tool being called
        const toolNames = toolUseBlocks.map((b: any) => this.toolLabel(b.name))
        emit(toolNames.join(', ') + '...')

        // Execute all tool calls and build tool_result blocks
        const toolResults: ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block) => {
            const toolBlock = block as any
            const toolName = toolBlock.name as ToolName
            try {
              const toolResult = await this.executeTool(
                tenantSchema,
                userId,
                tenantId,
                toolName,
                (toolBlock.input ?? {}) as Record<string, unknown>,
              )
              let content = JSON.stringify(safeStringify(toolResult))
              // Truncate large tool results to prevent bloating context
              if (content.length > 8000) {
                this.logger.warn(`[Chat] Tool ${toolName} result truncated: ${content.length} → 8000 chars`)
                content = content.slice(0, 8000) + '...(truncated, ask user to narrow query if needed)'
              }
              return {
                type: 'tool_result' as const,
                tool_use_id: toolBlock.id,
                content,
              }
            } catch (err) {
              this.logger.error(`Tool ${toolName} failed: ${String(err)}`)
              return {
                type: 'tool_result' as const,
                tool_use_id: toolBlock.id,
                is_error: true,
                content: `Tool execution failed: ${String(err)}`,
              }
            }
          }),
        )

        this.logger.log(`[Chat] Turn ${turn} — ${toolUseBlocks.map((b: any) => b.name).join(', ')} executed`)

        // Add tool results as a user message
        messages.push({ role: 'user', content: toolResults })
      }

      // If we exhausted turns, do one final call without tools to get a text response
      emit('Preparing response...')
      const finalResponse = await this.callAnthropic({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(),
        messages,
      })
      const textBlocks = finalResponse.content.filter((b) => b.type === 'text')
      this.logger.log(`[Chat] Final response after ${Date.now() - startTime}ms`)
      return textBlocks.map((b) => (b as any).text).join('\n') || 'I reached my tool usage limit for this request. Please try again.'
    } catch (err: any) {
      this.logger.error('Chat error: ' + String(err))
      if (err instanceof Error) this.logger.error(err.stack ?? '')
      throw err
    }
  }

  private async executeTool(
    tenantSchema: string,
    userId: string,
    tenantId: string,
    name: ToolName,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    switch (name) {
      // ─── Read tools ──────────────────────────────────────────────────────────
      case 'get_dashboard_stats':
        return this.dashboardService.getStats(tenantSchema)

      case 'get_invoices':
        return this.invoicesService.findAll(tenantSchema, str(input.status))

      case 'get_payments':
        return this.paymentsService.findAll(tenantSchema)

      case 'get_contacts':
        return this.contactsService.findAll(tenantSchema, str(input.type))

      case 'get_products':
        return this.productsService.findAll(tenantSchema, str(input.search))

      case 'get_low_stock':
        return this.stockService.getLowStockProducts(tenantSchema)

      case 'get_departments':
        return this.departmentsService.findAll(tenantSchema)

      case 'get_warehouses':
        return this.warehousesService.findAll(tenantSchema)

      case 'get_stock_movements':
        return this.stockService.findAllMovements(tenantSchema, str(input.productId), str(input.type))

      case 'get_employees':
        return this.employeesService.findAll(tenantSchema, str(input.status))

      case 'get_leave_types':
        return this.leaveService.getLeaveTypes(tenantSchema)

      case 'get_leave_balances':
        return this.leaveService.getEmployeeBalances(
          tenantSchema,
          str(input.employeeId) as string,
          input.year ? Number(input.year) : undefined,
        )

      case 'get_leave_requests':
        return this.leaveService.getRequests(tenantSchema, undefined, str(input.status))

      case 'get_payroll_runs':
        return this.payrollService.findAllRuns(tenantSchema)

      case 'get_payroll_items':
        return this.payrollService.getRunItems(tenantSchema, str(input.runId) as string)

      case 'get_leads':
        return this.leadsService.findAll(tenantSchema, str(input.status))

      case 'get_opportunities':
        return this.opportunitiesService.findAll(tenantSchema, str(input.stage))

      case 'get_quotations':
        return this.quotationsService.findAll(tenantSchema, str(input.status))

      // ─── Holidays ──────────────────────────────────────────────────────────
      case 'get_holidays':
        return this.holidaysService.findAll(tenantSchema, input.year ? Number(input.year) : undefined)

      // ─── Attendance / Work Entries ──────────────────────────────────────────
      case 'get_work_entries':
        return this.attendanceService.getEntries(
          tenantSchema,
          str(input.employeeId) as string,
          str(input.startDate) as string,
          str(input.endDate) as string,
        )

      case 'get_monthly_attendance':
        return this.attendanceService.getMonthlyEntries(
          tenantSchema,
          Number(input.year),
          Number(input.month),
        )

      case 'get_attendance_summary':
        return this.attendanceService.getMonthlySummary(
          tenantSchema,
          str(input.employeeId) as string,
          Number(input.year),
          Number(input.month),
        )

      // ─── Claims ────────────────────────────────────────────────────────────
      case 'get_claims':
        return this.claimsService.findAll(tenantSchema, str(input.employeeId), str(input.status))

      case 'get_claim_types':
        return this.claimsService.getClaimTypes(tenantSchema)

      // ─── Employment History ────────────────────────────────────────────────
      case 'get_employment_history':
        return this.employeesService.getHistory(tenantSchema, str(input.employeeId) as string)

      // ─── Termination preview (read-only) ───────────────────────────────────
      case 'calculate_termination':
        return this.employeesService.calculateTermination(
          tenantSchema,
          str(input.employeeId) as string,
          str(input.terminationDate) as string,
        )

      // ─── Journals ──────────────────────────────────────────────────────────
      case 'get_journals':
        return this.journalsService.findAll(tenantSchema, str(input.status))

      // ─── Bills (AP) ──────────────────────────────────────────────────────
      case 'get_bills':
        return this.billsService.findAll(tenantSchema, str(input.status))

      // ─── Financial Reports ────────────────────────────────────────────────
      case 'get_trial_balance':
        return this.reportsService.getTrialBalance(tenantSchema, str(input.asOfDate) as string)

      case 'get_profit_loss':
        return this.reportsService.getProfitAndLoss(tenantSchema, str(input.startDate) as string, str(input.endDate) as string)

      case 'get_balance_sheet':
        return this.reportsService.getBalanceSheet(tenantSchema, str(input.asOfDate) as string)

      case 'get_ar_aging':
        return this.reportsService.getARAging(tenantSchema)

      case 'get_ap_aging':
        return this.reportsService.getAPAging(tenantSchema)

      // ─── Banking ──────────────────────────────────────────────────────────
      case 'get_bank_accounts':
        return this.bankingService.findAllAccounts(tenantSchema)

      case 'get_bank_transactions':
        return this.bankingService.getTransactions(
          tenantSchema,
          str(input.bankAccountId) as string,
          str(input.startDate),
          str(input.endDate),
        )

      // ─── Tax Codes ────────────────────────────────────────────────────────
      case 'get_tax_codes':
        return this.taxService.findAll(tenantSchema)

      // ─── Compliance ───────────────────────────────────────────────────────
      case 'get_compliance_dashboard':
        return this.complianceService.getDashboard(tenantSchema)

      case 'get_compliance_obligations':
        return this.complianceService.getObligations(
          tenantSchema,
          input.year ? Number(input.year) : undefined,
          input.month ? Number(input.month) : undefined,
          str(input.status),
        )

      // ─── Confirmation passthrough ─────────────────────────────────────────────
      case 'confirm_action':
        this.logger.log(`confirm_action: action=${str(input.action)}, summary="${str(input.summary)?.slice(0, 80)}..."`)
        return {
          pending: true,
          action: input.action,
          payload: input.payload,
          summary: input.summary,
          instruction: 'Show the summary to the user and include the payload block. STOP — do NOT call more tools. Wait for user to say yes.',
        }

      // ─── Execute confirmed write action ───────────────────────────────────────
      case 'execute_confirmed_action': {
        const action = input.action as string
        const payload = parsePayload(input.payload)
        this.logger.log(`execute_confirmed_action: action=${action}, payload keys=${Object.keys(payload).join(',')}`)
        return this.executeWrite(tenantSchema, userId, tenantId, action, payload)
      }

      // ─── Direct write tool cases (fallback if Claude skips confirmation) ─────
      case 'create_employee':
      case 'update_employee':
      case 'update_employee_status':
      case 'create_contact':
      case 'create_invoice':
      case 'update_invoice_status':
      case 'record_payment':
      case 'create_product':
      case 'record_stock_movement':
      case 'create_department':
      case 'submit_leave_request':
      case 'approve_leave_request':
      case 'reject_leave_request':
      case 'create_payroll_run':
      case 'generate_payroll_items':
      case 'approve_payroll_run':
      case 'mark_payroll_paid':
      case 'create_quotation':
      case 'update_quotation_status':
      case 'convert_quotation_to_invoice':
      case 'create_lead':
      case 'update_lead_status':
      case 'create_opportunity':
      case 'update_opportunity_stage':
      case 'create_holiday':
      case 'seed_holidays':
      case 'record_work_entry':
      case 'submit_claim':
      case 'approve_claim':
      case 'reject_claim':
      case 'record_job_change':
      case 'process_termination':
      case 'init_leave_balances':
      case 'create_journal_entry':
      case 'post_journal_entry':
      case 'reverse_journal_entry':
      case 'create_bill':
      case 'approve_bill':
      case 'pay_bill':
      case 'create_credit_note':
      case 'create_debit_note':
      case 'create_bank_account':
      case 'create_bank_transaction':
      case 'match_bank_transaction':
      case 'seed_tax_codes':
      case 'generate_monthly_obligations':
      case 'complete_compliance_obligation':
        return this.executeWrite(tenantSchema, userId, tenantId, name, input as Record<string, unknown>)

      default:
        throw new Error(`Unknown tool: ${name as string}`)
    }
  }

  /** Maps write action names to audit entity types and audit actions */
  private resolveAuditMeta(action: string): { entity: string; auditAction: string } {
    const map: Record<string, { entity: string; auditAction: string }> = {
      create_employee:       { entity: 'employee',       auditAction: 'CREATE' },
      update_employee:       { entity: 'employee',       auditAction: 'UPDATE' },
      update_employee_status:{ entity: 'employee',       auditAction: 'UPDATE' },
      create_contact:        { entity: 'contact',        auditAction: 'CREATE' },
      create_invoice:        { entity: 'invoice',        auditAction: 'CREATE' },
      update_invoice_status: { entity: 'invoice',        auditAction: 'UPDATE' },
      record_payment:        { entity: 'payment',        auditAction: 'CREATE' },
      create_product:        { entity: 'product',        auditAction: 'CREATE' },
      record_stock_movement: { entity: 'stock_movement', auditAction: 'CREATE' },
      create_department:     { entity: 'department',     auditAction: 'CREATE' },
      submit_leave_request:  { entity: 'leave_request',  auditAction: 'CREATE' },
      approve_leave_request: { entity: 'leave_request',  auditAction: 'APPROVE' },
      reject_leave_request:  { entity: 'leave_request',  auditAction: 'REJECT' },
      create_payroll_run:    { entity: 'payroll',        auditAction: 'CREATE' },
      generate_payroll_items:{ entity: 'payroll',        auditAction: 'GENERATE' },
      approve_payroll_run:   { entity: 'payroll',        auditAction: 'APPROVE' },
      mark_payroll_paid:     { entity: 'payroll',        auditAction: 'MARK_PAID' },
      create_lead:           { entity: 'lead',           auditAction: 'CREATE' },
      update_lead_status:    { entity: 'lead',           auditAction: 'UPDATE' },
      create_opportunity:    { entity: 'opportunity',    auditAction: 'CREATE' },
      update_opportunity_stage: { entity: 'opportunity', auditAction: 'UPDATE' },
      create_quotation:      { entity: 'quotation',      auditAction: 'CREATE' },
      update_quotation_status:  { entity: 'quotation',   auditAction: 'UPDATE' },
      convert_quotation_to_invoice: { entity: 'quotation', auditAction: 'CREATE' },
      create_holiday:        { entity: 'public_holiday',  auditAction: 'CREATE' },
      seed_holidays:         { entity: 'public_holiday',  auditAction: 'SEED' },
      record_work_entry:     { entity: 'work_entry',      auditAction: 'CREATE' },
      submit_claim:          { entity: 'claim',           auditAction: 'CREATE' },
      approve_claim:         { entity: 'claim',           auditAction: 'APPROVE' },
      reject_claim:          { entity: 'claim',           auditAction: 'REJECT' },
      record_job_change:     { entity: 'employment_history', auditAction: 'CREATE' },
      process_termination:   { entity: 'employee',        auditAction: 'TERMINATE' },
      init_leave_balances:   { entity: 'leave_balance',   auditAction: 'BULK_INIT' },
      create_journal_entry:  { entity: 'journal_entry',   auditAction: 'CREATE' },
      post_journal_entry:    { entity: 'journal_entry',   auditAction: 'UPDATE' },
      reverse_journal_entry: { entity: 'journal_entry',   auditAction: 'UPDATE' },
      create_bill:           { entity: 'bill',            auditAction: 'CREATE' },
      approve_bill:          { entity: 'bill',            auditAction: 'APPROVE' },
      pay_bill:              { entity: 'bill',            auditAction: 'CREATE' },
      create_credit_note:    { entity: 'invoice',         auditAction: 'CREATE' },
      create_debit_note:     { entity: 'invoice',         auditAction: 'CREATE' },
      create_bank_account:   { entity: 'bank_account',    auditAction: 'CREATE' },
      create_bank_transaction: { entity: 'bank_transaction', auditAction: 'CREATE' },
      match_bank_transaction:  { entity: 'bank_transaction', auditAction: 'UPDATE' },
      seed_tax_codes:        { entity: 'tax_code',        auditAction: 'SEED' },
      generate_monthly_obligations: { entity: 'compliance_obligation', auditAction: 'GENERATE' },
      complete_compliance_obligation: { entity: 'compliance_obligation', auditAction: 'UPDATE' },
    }
    return map[action] ?? { entity: action, auditAction: 'CREATE' }
  }

  private async executeWrite(
    tenantSchema: string,
    userId: string,
    tenantId: string,
    action: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    let writeResult: unknown

    switch (action) {
      // ─── Employees ──────────────────────────────────────────────────────────
      case 'create_employee':
        writeResult = await this.employeesService.create(tenantSchema, {
          fullName: payload.fullName as string,
          hireDate: payload.hireDate as string,
          basicSalarySen: payload.basicSalarySen ? Number(payload.basicSalarySen) : 0,
          employmentType: (payload.employmentType as any) || 'FULL_TIME',
          icNumber: (payload.icNumber as string) || undefined,
          email: (payload.email as string) || undefined,
          phone: (payload.phone as string) || undefined,
          departmentId: (payload.departmentId as string) || undefined,
          positionId: (payload.positionId as string) || undefined,
          nationality: (payload.nationality as string) || undefined,
        }, userId)
        break

      case 'update_employee':
        writeResult = await this.employeesService.update(tenantSchema, payload.employeeId as string, {
          fullName: (payload.fullName as string) || undefined,
          email: (payload.email as string) || undefined,
          phone: (payload.phone as string) || undefined,
          basicSalarySen: payload.basicSalarySen ? Number(payload.basicSalarySen) : undefined,
          departmentId: (payload.departmentId as string) || undefined,
          positionId: (payload.positionId as string) || undefined,
          employmentType: (payload.employmentType as any) || undefined,
          bankName: (payload.bankName as string) || undefined,
          bankAccountNumber: (payload.bankAccountNumber as string) || undefined,
        })
        break

      case 'update_employee_status':
        writeResult = await this.employeesService.updateStatus(
          tenantSchema,
          payload.employeeId as string,
          payload.status as string,
          (payload.date as string) || undefined,
        )
        break

      // ─── Contacts ───────────────────────────────────────────────────────────
      case 'create_contact':
        writeResult = await this.contactsService.create(tenantSchema, {
          type: payload.type as 'CUSTOMER' | 'SUPPLIER' | 'BOTH',
          name: payload.name as string,
          companyName: (payload.companyName as string) || undefined,
          email: (payload.email as string) || undefined,
          phone: (payload.phone as string) || undefined,
          city: (payload.city as string) || undefined,
          state: (payload.state as string) || undefined,
          paymentTerms: payload.paymentTerms ? Number(payload.paymentTerms) : undefined,
        }, userId)
        break

      // ─── Invoices ───────────────────────────────────────────────────────────
      case 'create_invoice': {
        const rawLines = payload.lines
        let lines: any[]
        if (typeof rawLines === 'string') {
          lines = JSON.parse(rawLines)
        } else if (Array.isArray(rawLines)) {
          lines = rawLines
        } else {
          lines = []
        }
        writeResult = await this.invoicesService.create(tenantSchema, {
          contactId: payload.contactId as string,
          issueDate: payload.issueDate as string,
          dueDate: (payload.dueDate as string) || undefined,
          notes: (payload.notes as string) || undefined,
          lines: lines.map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPriceSen: Number(l.unitPriceSen),
            discountPercent: l.discountPercent ? Number(l.discountPercent) : 0,
            sstRate: l.sstRate ? Number(l.sstRate) : 0,
          })),
        }, userId, tenantId)
        break
      }

      case 'update_invoice_status':
        writeResult = await this.invoicesService.updateStatus(
          tenantSchema,
          payload.invoiceId as string,
          payload.status as string,
          userId,
        )
        break

      // ─── Payments ───────────────────────────────────────────────────────────
      case 'record_payment':
        writeResult = await this.paymentsService.create(tenantSchema, {
          type: payload.type as 'RECEIVED' | 'MADE',
          contactId: payload.contactId as string,
          date: payload.date as string,
          amountSen: Number(payload.amountSen),
          method: (payload.method as any) || 'BANK_TRANSFER',
          reference: (payload.reference as string) || undefined,
          invoiceId: (payload.invoiceId as string) || undefined,
          notes: (payload.notes as string) || undefined,
        }, userId)
        break

      // ─── Products ───────────────────────────────────────────────────────────
      case 'create_product':
        writeResult = await this.productsService.create(tenantSchema, {
          name: payload.name as string,
          type: (payload.type as any) || 'PRODUCT',
          sku: (payload.sku as string) || undefined,
          sellingPriceSen: payload.sellingPriceSen ? Number(payload.sellingPriceSen) : undefined,
          costPriceSen: payload.costPriceSen ? Number(payload.costPriceSen) : undefined,
          unitOfMeasure: (payload.unitOfMeasure as string) || undefined,
          trackInventory: payload.trackInventory !== undefined ? Boolean(payload.trackInventory) : undefined,
          reorderPoint: payload.reorderPoint ? Number(payload.reorderPoint) : undefined,
          description: (payload.description as string) || undefined,
        }, userId)
        break

      // ─── Stock ──────────────────────────────────────────────────────────────
      case 'record_stock_movement':
        writeResult = await this.stockService.recordMovement(tenantSchema, {
          type: payload.type as any,
          productId: payload.productId as string,
          warehouseId: payload.warehouseId as string,
          quantity: Number(payload.quantity),
          unitCostSen: payload.unitCostSen ? Number(payload.unitCostSen) : undefined,
          notes: (payload.notes as string) || undefined,
          destWarehouseId: (payload.destWarehouseId as string) || undefined,
        }, userId)
        break

      // ─── Departments ────────────────────────────────────────────────────────
      case 'create_department':
        writeResult = await this.departmentsService.create(tenantSchema, {
          name: payload.name as string,
          code: (payload.code as string) || undefined,
          description: (payload.description as string) || undefined,
        })
        break

      // ─── Leave ──────────────────────────────────────────────────────────────
      case 'submit_leave_request':
        writeResult = await this.leaveService.createRequest(tenantSchema, {
          employeeId: payload.employeeId as string,
          leaveTypeId: payload.leaveTypeId as string,
          startDate: payload.startDate as string,
          endDate: payload.endDate as string,
          days: Number(payload.days),
          reason: (payload.reason as string) || undefined,
        })
        break

      case 'approve_leave_request':
        writeResult = await this.leaveService.approveRequest(
          tenantSchema,
          payload.requestId as string,
          userId,
        )
        break

      case 'reject_leave_request':
        writeResult = await this.leaveService.rejectRequest(
          tenantSchema,
          payload.requestId as string,
          userId,
          (payload.reason as string) || undefined,
        )
        break

      // ─── Payroll ────────────────────────────────────────────────────────────
      case 'create_payroll_run':
        writeResult = await this.payrollService.createRun(
          tenantSchema,
          Number(payload.month),
          Number(payload.year),
          userId,
          (payload.notes as string) || undefined,
        )
        break

      case 'generate_payroll_items':
        writeResult = await this.payrollService.generateItems(tenantSchema, payload.runId as string)
        break

      case 'approve_payroll_run':
        writeResult = await this.payrollService.approveRun(tenantSchema, payload.runId as string, userId)
        break

      case 'mark_payroll_paid':
        writeResult = await this.payrollService.markPaid(tenantSchema, payload.runId as string)
        break

      // ─── CRM ────────────────────────────────────────────────────────────────
      case 'create_lead':
        writeResult = await this.leadsService.create(tenantSchema, {
          name: payload.name as string,
          company: (payload.company as string) || undefined,
          email: (payload.email as string) || undefined,
          phone: (payload.phone as string) || undefined,
          source: (payload.source as string) || undefined,
          expectedValueSen: payload.expectedValueSen ? Number(payload.expectedValueSen) : undefined,
          notes: (payload.notes as string) || undefined,
        }, userId)
        break

      case 'update_lead_status':
        writeResult = await this.leadsService.update(tenantSchema, payload.leadId as string, {
          status: payload.status as string,
        })
        break

      case 'create_opportunity':
        writeResult = await this.opportunitiesService.create(tenantSchema, {
          name: payload.name as string,
          contactId: (payload.contactId as string) || undefined,
          stage: (payload.stage as string) || undefined,
          probability: payload.probability ? Number(payload.probability) : undefined,
          expectedValueSen: payload.expectedValueSen ? Number(payload.expectedValueSen) : undefined,
          expectedCloseDate: (payload.expectedCloseDate as string) || undefined,
          notes: (payload.notes as string) || undefined,
        }, userId)
        break

      case 'update_opportunity_stage':
        writeResult = await this.opportunitiesService.update(tenantSchema, payload.opportunityId as string, {
          stage: payload.stage as string,
        })
        break

      case 'create_quotation': {
        const rawLines = payload.lines
        let qLines: any[]
        if (typeof rawLines === 'string') {
          qLines = JSON.parse(rawLines)
        } else if (Array.isArray(rawLines)) {
          qLines = rawLines
        } else {
          qLines = []
        }
        writeResult = await this.quotationsService.create(tenantSchema, {
          contactId: payload.contactId as string,
          issueDate: payload.issueDate as string,
          expiryDate: (payload.expiryDate as string) || undefined,
          notes: (payload.notes as string) || undefined,
          terms: (payload.terms as string) || undefined,
          lines: qLines.map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPriceSen: Number(l.unitPriceSen),
            discountPercent: l.discountPercent ? Number(l.discountPercent) : 0,
            sstRate: l.sstRate ? Number(l.sstRate) : 0,
          })),
        }, userId, tenantId)
        break
      }

      case 'update_quotation_status':
        writeResult = await this.quotationsService.updateStatus(
          tenantSchema,
          payload.quotationId as string,
          payload.status as string,
        )
        break

      case 'convert_quotation_to_invoice':
        writeResult = await this.quotationsService.convertToInvoice(
          tenantSchema,
          payload.quotationId as string,
        )
        break

      // ─── Holidays ──────────────────────────────────────────────────────────
      case 'create_holiday':
        writeResult = await this.holidaysService.create(tenantSchema, {
          name: payload.name as string,
          date: payload.date as string,
          isMandatory: payload.isMandatory !== undefined ? Boolean(payload.isMandatory) : undefined,
          state: (payload.state as string) || undefined,
        })
        break

      case 'seed_holidays':
        writeResult = await this.holidaysService.seedYear(tenantSchema, Number(payload.year))
        break

      // ─── Attendance / Work Entries ──────────────────────────────────────────
      case 'record_work_entry':
        writeResult = await this.attendanceService.upsertEntry(tenantSchema, {
          employeeId: payload.employeeId as string,
          date: payload.date as string,
          normalHours: payload.normalHours !== undefined ? Number(payload.normalHours) : undefined,
          overtimeHours: payload.overtimeHours !== undefined ? Number(payload.overtimeHours) : undefined,
          restDayHours: payload.restDayHours !== undefined ? Number(payload.restDayHours) : undefined,
          phHours: payload.phHours !== undefined ? Number(payload.phHours) : undefined,
          isRestDay: payload.isRestDay !== undefined ? Boolean(payload.isRestDay) : undefined,
          isPublicHoliday: payload.isPublicHoliday !== undefined ? Boolean(payload.isPublicHoliday) : undefined,
          isAbsent: payload.isAbsent !== undefined ? Boolean(payload.isAbsent) : undefined,
          isLate: payload.isLate !== undefined ? Boolean(payload.isLate) : undefined,
          notes: (payload.notes as string) || undefined,
        }, userId)
        break

      // ─── Claims ────────────────────────────────────────────────────────────
      case 'submit_claim': {
        const rawLines = payload.lines
        let claimLines: any[]
        if (typeof rawLines === 'string') {
          claimLines = JSON.parse(rawLines)
        } else if (Array.isArray(rawLines)) {
          claimLines = rawLines
        } else {
          claimLines = []
        }
        writeResult = await this.claimsService.create(tenantSchema, {
          employeeId: payload.employeeId as string,
          claimDate: payload.claimDate as string,
          notes: (payload.notes as string) || undefined,
          lines: claimLines.map((l: any) => ({
            claimTypeId: l.claimTypeId,
            description: l.description,
            amountSen: Number(l.amountSen),
            receiptUrl: l.receiptUrl || undefined,
            date: l.date,
          })),
        })
        break
      }

      case 'approve_claim':
        writeResult = await this.claimsService.approve(
          tenantSchema,
          payload.claimId as string,
          userId,
        )
        break

      case 'reject_claim':
        writeResult = await this.claimsService.reject(
          tenantSchema,
          payload.claimId as string,
          userId,
          (payload.reason as string) || undefined,
        )
        break

      // ─── Employment History & Termination ──────────────────────────────────
      case 'record_job_change':
        writeResult = await this.employeesService.recordJobChange(
          tenantSchema,
          payload.employeeId as string,
          {
            changeType: payload.changeType as 'TRANSFER' | 'PROMOTION' | 'SALARY_CHANGE' | 'DEMOTION',
            effectiveDate: payload.effectiveDate as string,
            departmentId: (payload.departmentId as string) || undefined,
            positionId: (payload.positionId as string) || undefined,
            basicSalarySen: payload.basicSalarySen ? Number(payload.basicSalarySen) : undefined,
            reason: (payload.reason as string) || undefined,
          },
          userId,
        )
        break

      case 'process_termination':
        writeResult = await this.employeesService.processTermination(
          tenantSchema,
          payload.employeeId as string,
          {
            terminationDate: payload.terminationDate as string,
            reason: (payload.reason as string) || undefined,
          },
          userId,
        )
        break

      // ─── Leave Balances ────────────────────────────────────────────────────
      case 'init_leave_balances':
        writeResult = await this.leaveService.initAllEmployeeBalances(
          tenantSchema,
          Number(payload.year),
        )
        break

      // ─── Journal Entries ────────────────────────────────────────────────────
      case 'create_journal_entry': {
        const rawLines = payload.lines
        let jLines: any[]
        if (typeof rawLines === 'string') {
          jLines = JSON.parse(rawLines)
        } else if (Array.isArray(rawLines)) {
          jLines = rawLines
        } else {
          jLines = []
        }
        writeResult = await this.journalsService.create(tenantSchema, {
          date: payload.date as string,
          description: payload.description as string,
          sourceType: ((payload.source as string) || 'MANUAL') as 'INVOICE' | 'PAYMENT' | 'PAYROLL' | 'MANUAL',
          lines: jLines.map((l: any) => ({
            accountId: l.accountId,
            description: l.description || undefined,
            debitSen: Number(l.debitSen ?? 0),
            creditSen: Number(l.creditSen ?? 0),
          })),
        }, userId)
        break
      }

      case 'post_journal_entry':
        writeResult = await this.journalsService.post(
          tenantSchema,
          payload.journalId as string,
          userId,
        )
        break

      case 'reverse_journal_entry':
        writeResult = await this.journalsService.reverse(
          tenantSchema,
          payload.journalId as string,
          userId,
        )
        break

      // ─── Bills (AP) ────────────────────────────────────────────────────────
      case 'create_bill': {
        const rawLines = payload.lines
        let bLines: any[]
        if (typeof rawLines === 'string') {
          bLines = JSON.parse(rawLines)
        } else if (Array.isArray(rawLines)) {
          bLines = rawLines
        } else {
          bLines = []
        }
        writeResult = await this.billsService.create(tenantSchema, {
          contactId: payload.contactId as string,
          billDate: payload.billDate as string,
          dueDate: (payload.dueDate as string) || undefined,
          notes: (payload.notes as string) || undefined,
          lines: bLines.map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPriceSen: Number(l.unitPriceSen),
            discountPercent: l.discountPercent ? Number(l.discountPercent) : 0,
            sstRate: l.sstRate ? Number(l.sstRate) : 0,
            accountId: l.accountId || undefined,
          })),
        }, userId)
        break
      }

      case 'approve_bill':
        writeResult = await this.billsService.approve(
          tenantSchema,
          payload.billId as string,
          userId,
        )
        break

      case 'pay_bill':
        writeResult = await this.billsService.recordPayment(
          tenantSchema,
          payload.billId as string,
          {
            amountSen: Number(payload.amountSen),
            date: payload.date as string,
            method: ((payload.method as string) || undefined) as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'DUITNOW' | 'TNG' | 'GRABPAY' | 'CARD' | undefined,
            reference: (payload.reference as string) || undefined,
          },
          userId,
        )
        break

      // ─── Credit/Debit Notes ─────────────────────────────────────────────────
      case 'create_credit_note':
      case 'create_debit_note': {
        const noteType = action === 'create_credit_note' ? 'CREDIT_NOTE' : 'DEBIT_NOTE'
        const rawLines = payload.lines
        let cnLines: any[]
        if (typeof rawLines === 'string') {
          cnLines = JSON.parse(rawLines)
        } else if (Array.isArray(rawLines)) {
          cnLines = rawLines
        } else {
          cnLines = []
        }
        writeResult = await this.invoicesService.createCreditDebitNote(
          tenantSchema,
          payload.invoiceId as string,
          noteType,
          {
            reason: payload.reason as string,
            lines: cnLines.map((l: any) => ({
              description: l.description,
              quantity: Number(l.quantity),
              unitPriceSen: Number(l.unitPriceSen),
              discountPercent: l.discountPercent ? Number(l.discountPercent) : 0,
              sstRate: l.sstRate ? Number(l.sstRate) : 0,
            })),
          },
          userId,
          tenantId,
        )
        break
      }

      // ─── Banking ──────────────────────────────────────────────────────────
      case 'create_bank_account':
        writeResult = await this.bankingService.createAccount(tenantSchema, {
          bankName: payload.bankName as string,
          name: payload.accountName as string,
          accountNo: payload.accountNumber as string,
          accountType: ((payload.accountType as string) || 'CURRENT') as 'CURRENT' | 'SAVINGS',
          currency: (payload.currency as string) || 'MYR',
          openingBalanceSen: payload.openingBalanceSen ? Number(payload.openingBalanceSen) : 0,
        }, userId)
        break

      case 'create_bank_transaction': {
        // The DTO uses positive/negative amountSen instead of type field
        // DEBIT (money out) = negative, CREDIT (money in) = positive
        const txType = (payload.type as string)?.toUpperCase()
        let txAmountSen = Math.abs(Number(payload.amountSen))
        if (txType === 'DEBIT') txAmountSen = -txAmountSen
        writeResult = await this.bankingService.createTransaction(tenantSchema, {
          bankAccountId: payload.bankAccountId as string,
          date: payload.date as string,
          description: payload.description as string,
          amountSen: txAmountSen,
          reference: (payload.reference as string) || undefined,
        })
        break
      }

      case 'match_bank_transaction':
        writeResult = await this.bankingService.matchTransaction(
          tenantSchema,
          payload.transactionId as string,
          payload.paymentId as string,
        )
        break

      // ─── Tax & Compliance ─────────────────────────────────────────────────
      case 'seed_tax_codes':
        writeResult = await this.taxService.seedDefaultCodes(tenantSchema)
        break

      case 'generate_monthly_obligations':
        writeResult = await this.complianceService.generateMonthlyObligations(
          tenantSchema,
          Number(payload.year),
          Number(payload.month),
        )
        break

      case 'complete_compliance_obligation':
        writeResult = await this.complianceService.completeObligation(
          tenantSchema,
          payload.obligationId as string,
          userId,
        )
        break

      default:
        throw new Error(`Unknown write action: ${action}`)
    }

    // Fire audit log for AI-initiated write actions
    const meta = this.resolveAuditMeta(action)
    const entityId = (writeResult as any)?.id ?? payload.employeeId ?? payload.invoiceId ?? payload.quotationId ?? payload.leadId ?? payload.opportunityId ?? payload.requestId ?? payload.runId ?? payload.claimId ?? payload.journalId ?? payload.billId ?? payload.transactionId ?? payload.obligationId
    this.auditService.log({
      tenantSchema,
      userId,
      userEmail: 'AI Assistant',
      action: meta.auditAction,
      entityType: meta.entity,
      entityId: entityId ? String(entityId) : undefined,
      details: { source: 'ai_assistant', tool: action, ...this.stripSensitive(payload) },
      ipAddress: undefined,
    })

    return writeResult
  }

  private stripSensitive(payload: Record<string, unknown>): Record<string, unknown> {
    const { password, passwordHash, currentPassword, newPassword, ...safe } = payload
    void password; void passwordHash; void currentPassword; void newPassword
    return safe
  }
}

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
import { LeadsService } from '../crm/leads.service'
import { OpportunitiesService } from '../crm/opportunities.service'
import { QuotationsService } from '../crm/quotations.service'
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
    private readonly leadsService: LeadsService,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly quotationsService: QuotationsService,
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

      default:
        throw new Error(`Unknown write action: ${action}`)
    }

    // Fire audit log for AI-initiated write actions
    const meta = this.resolveAuditMeta(action)
    const entityId = (writeResult as any)?.id ?? payload.employeeId ?? payload.invoiceId ?? payload.quotationId ?? payload.leadId ?? payload.opportunityId ?? payload.requestId ?? payload.runId
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

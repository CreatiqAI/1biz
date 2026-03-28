import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { Response } from 'express'
import { InvoicesService, CreateInvoiceDto } from './invoices.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../auth/guards/module.guard'
import { RequireModules } from '../auth/decorators/modules.decorator'
import { Audit } from '../audit/audit.decorator'
import { toCsv, sendCsv } from '../../common/export.helper'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.ACCOUNTING)
@Controller('accounting/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List invoices with pagination, search, and optional CSV export' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'format', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const p = page ? parseInt(page) : 1
    const l = Math.min(limit ? parseInt(limit) : 25, 500)
    const result = await this.invoicesService.findAll(user.tenantSchema, status, search, format === 'csv' ? 1 : p, format === 'csv' ? 10000 : l)

    if (format === 'csv' && res) {
      const headers = ['Invoice No', 'Contact', 'Issue Date', 'Due Date', 'Status', 'Total (RM)', 'Paid (RM)', 'Balance (RM)']
      const keys = ['invoice_no', 'contact_name', 'issue_date', 'due_date', 'status', 'total_rm', 'paid_rm', 'balance_rm']
      const rows = (result.data as any[]).map((r: any) => ({
        ...r,
        total_rm: (Number(r.total_sen) / 100).toFixed(2),
        paid_rm: (Number(r.paid_sen) / 100).toFixed(2),
        balance_rm: (Number(r.balance_sen) / 100).toFixed(2),
      }))
      return sendCsv(res, 'invoices.csv', toCsv(headers, rows, keys))
    }

    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.invoicesService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('invoice')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateInvoiceDto) {
    return {
      success: true,
      data: await this.invoicesService.create(user.tenantSchema, dto, user.userId, user.tenantId),
      message: 'Invoice created successfully',
    }
  }

  @Patch('bulk/status')
  @Audit('invoice', 'BULK')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Bulk update invoice statuses' })
  async bulkUpdateStatus(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { ids: string[]; status: string },
  ) {
    const results = await Promise.allSettled(
      body.ids.map((id) => this.invoicesService.updateStatus(user.tenantSchema, id, body.status, user.userId)),
    )
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    return { success: true, data: { succeeded, failed, total: body.ids.length } }
  }

  @Patch(':id/status')
  @Audit('invoice')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Update invoice status (SENT, CANCELLED)' })
  async updateStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return { success: true, data: await this.invoicesService.updateStatus(user.tenantSchema, id, body.status, user.userId) }
  }

  @Post(':id/credit-note')
  @Audit('invoice', 'CREATE')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a Credit Note against an invoice' })
  async createCreditNote(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { reason: string; lines: { description: string; quantity: number; unitPriceSen: number; discountPercent?: number; sstRate?: number; accountId?: string }[] },
  ) {
    return {
      success: true,
      data: await this.invoicesService.createCreditDebitNote(user.tenantSchema, id, 'CREDIT_NOTE', body, user.userId, user.tenantId),
      message: 'Credit Note created successfully',
    }
  }

  @Post(':id/debit-note')
  @Audit('invoice', 'CREATE')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a Debit Note against an invoice' })
  async createDebitNote(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { reason: string; lines: { description: string; quantity: number; unitPriceSen: number; discountPercent?: number; sstRate?: number; accountId?: string }[] },
  ) {
    return {
      success: true,
      data: await this.invoicesService.createCreditDebitNote(user.tenantSchema, id, 'DEBIT_NOTE', body, user.userId, user.tenantId),
      message: 'Debit Note created successfully',
    }
  }
}

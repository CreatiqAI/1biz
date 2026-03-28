import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { Response } from 'express'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../auth/guards/module.guard'
import { RequireModules } from '../auth/decorators/modules.decorator'
import { toCsv, sendCsv } from '../../common/export.helper'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.ACCOUNTING)
@Controller('accounting/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiQuery({ name: 'asOfDate', required: true, description: 'As-of date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'format', required: false })
  async getTrialBalance(
    @CurrentUser() user: CurrentUserData,
    @Query('asOfDate') asOfDate: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getTrialBalance(user.tenantSchema, asOfDate)
    if (format === 'csv' && res) {
      const rows = (data as any).rows ?? data
      if (Array.isArray(rows)) {
        const headers = ['Account Code', 'Account Name', 'Account Type', 'Debit (RM)', 'Credit (RM)']
        const keys = ['code', 'name', 'type', 'debit_rm', 'credit_rm']
        const mapped = rows.map((r: any) => ({
          ...r,
          debit_rm: (Number(r.debit_sen ?? r.debit ?? 0) / 100).toFixed(2),
          credit_rm: (Number(r.credit_sen ?? r.credit ?? 0) / 100).toFixed(2),
        }))
        return sendCsv(res, `trial-balance-${asOfDate}.csv`, toCsv(headers, mapped, keys))
      }
    }
    return { success: true, data }
  }

  @Get('profit-loss')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get profit and loss report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Period start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Period end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'format', required: false })
  async getProfitAndLoss(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getProfitAndLoss(user.tenantSchema, startDate, endDate)
    if (format === 'csv' && res) {
      const sections = ['revenue', 'expenses']
      const rows: Record<string, unknown>[] = []
      for (const section of sections) {
        const items = (data as any)?.[section] ?? []
        if (Array.isArray(items)) {
          for (const item of items) {
            rows.push({ section, code: item.code, name: item.name, amount_rm: (Number(item.total_sen ?? item.balance_sen ?? 0) / 100).toFixed(2) })
          }
        }
      }
      const headers = ['Section', 'Account Code', 'Account Name', 'Amount (RM)']
      const keys = ['section', 'code', 'name', 'amount_rm']
      return sendCsv(res, `profit-loss-${startDate}-${endDate}.csv`, toCsv(headers, rows, keys))
    }
    return { success: true, data }
  }

  @Get('balance-sheet')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get balance sheet report' })
  @ApiQuery({ name: 'asOfDate', required: true, description: 'As-of date (YYYY-MM-DD)' })
  async getBalanceSheet(
    @CurrentUser() user: CurrentUserData,
    @Query('asOfDate') asOfDate: string,
  ) {
    return {
      success: true,
      data: await this.reportsService.getBalanceSheet(user.tenantSchema, asOfDate),
    }
  }

  @Get('cash-flow')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get cash flow statement' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Period start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Period end date (YYYY-MM-DD)' })
  async getCashFlow(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return {
      success: true,
      data: await this.reportsService.getCashFlow(user.tenantSchema, startDate, endDate),
    }
  }

  @Get('ap-aging')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get accounts payable aging report' })
  async getAPAging(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      data: await this.reportsService.getAPAging(user.tenantSchema),
    }
  }

  @Get('ar-aging')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get accounts receivable aging report' })
  @ApiQuery({ name: 'format', required: false })
  async getARAging(
    @CurrentUser() user: CurrentUserData,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getARAging(user.tenantSchema)
    if (format === 'csv' && res && Array.isArray(data)) {
      const headers = ['Contact', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total']
      const keys = ['contact_name', 'current_rm', 'd30_rm', 'd60_rm', 'd90_rm', 'd90p_rm', 'total_rm']
      const rows = data.map((r: any) => ({
        ...r,
        current_rm: (Number(r.current_sen ?? 0) / 100).toFixed(2),
        d30_rm: (Number(r.days_30_sen ?? 0) / 100).toFixed(2),
        d60_rm: (Number(r.days_60_sen ?? 0) / 100).toFixed(2),
        d90_rm: (Number(r.days_90_sen ?? 0) / 100).toFixed(2),
        d90p_rm: (Number(r.days_90_plus_sen ?? 0) / 100).toFixed(2),
        total_rm: (Number(r.total_sen ?? 0) / 100).toFixed(2),
      }))
      return sendCsv(res, 'ar-aging.csv', toCsv(headers, rows, keys))
    }
    return { success: true, data }
  }
}

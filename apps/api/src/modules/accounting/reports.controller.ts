import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiQuery({ name: 'asOfDate', required: true, description: 'As-of date (YYYY-MM-DD)' })
  async getTrialBalance(
    @CurrentUser() user: CurrentUserData,
    @Query('asOfDate') asOfDate: string,
  ) {
    return {
      success: true,
      data: await this.reportsService.getTrialBalance(user.tenantSchema, asOfDate),
    }
  }

  @Get('profit-loss')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get profit and loss report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Period start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Period end date (YYYY-MM-DD)' })
  async getProfitAndLoss(
    @CurrentUser() user: CurrentUserData,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return {
      success: true,
      data: await this.reportsService.getProfitAndLoss(user.tenantSchema, startDate, endDate),
    }
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
  async getARAging(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      data: await this.reportsService.getARAging(user.tenantSchema),
    }
  }
}

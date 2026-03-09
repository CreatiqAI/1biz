import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PayrollService } from './payroll.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr/payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  @Get('runs')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List all payroll runs' })
  async findAllRuns(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.svc.findAllRuns(user.tenantSchema) }
  }

  @Get('runs/:id')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get payroll run by ID' })
  async findOneRun(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.findOneRun(user.tenantSchema, id) }
  }

  @Get('runs/:id/items')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get payslip items for a payroll run' })
  async getRunItems(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.getRunItems(user.tenantSchema, id) }
  }

  @Post('runs')
  @Audit('payroll')
  @RequirePermissions(Permission.PAYROLL_RUN)
  @ApiOperation({ summary: 'Create a new payroll run' })
  async createRun(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { month: number; year: number; notes?: string },
  ) {
    return {
      success: true,
      data: await this.svc.createRun(user.tenantSchema, body.month, body.year, user.userId, body.notes),
    }
  }

  @Post('runs/:id/generate')
  @Audit('payroll', 'GENERATE')
  @RequirePermissions(Permission.PAYROLL_RUN)
  @ApiOperation({ summary: 'Generate payslip items for all active employees' })
  async generate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.generateItems(user.tenantSchema, id) }
  }

  @Patch('runs/:id/approve')
  @Audit('payroll', 'APPROVE')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @ApiOperation({ summary: 'Approve a payroll run' })
  async approve(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.approveRun(user.tenantSchema, id, user.userId) }
  }

  @Patch('runs/:id/mark-paid')
  @Audit('payroll', 'MARK_PAID')
  @RequirePermissions(Permission.PAYROLL_APPROVE)
  @ApiOperation({ summary: 'Mark payroll run as paid' })
  async markPaid(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.markPaid(user.tenantSchema, id) }
  }

  @Patch('items/:itemId')
  @Audit('payroll_item')
  @RequirePermissions(Permission.PAYROLL_RUN)
  @ApiOperation({ summary: 'Adjust individual payslip item (allowances, overtime, bonus)' })
  async updateItem(
    @CurrentUser() user: CurrentUserData,
    @Param('itemId') itemId: string,
    @Body() body: {
      allowancesSen?: number
      overtimeSen?: number
      bonusSen?: number
      otherDeductionsSen?: number
      notes?: string
    },
  ) {
    return { success: true, data: await this.svc.updateItem(user.tenantSchema, itemId, body) }
  }
}

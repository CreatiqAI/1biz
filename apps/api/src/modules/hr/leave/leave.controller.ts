import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { LeaveService } from './leave.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../../auth/guards/module.guard'
import { RequireModules } from '../../auth/decorators/modules.decorator'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.HR)
@Controller('hr/leave')
export class LeaveController {
  constructor(private readonly svc: LeaveService) {}

  // ── Leave Types ──────────────────────────────────────────────────────────────

  @Get('types')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List leave types' })
  async getTypes(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.svc.getLeaveTypes(user.tenantSchema) }
  }

  @Post('types')
  @Audit('leave_type')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Create a custom leave type' })
  async createType(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; code: string; daysPerYear?: number; isPaid?: boolean; requiresDocument?: boolean; carryoverDays?: number },
  ) {
    return { success: true, data: await this.svc.createLeaveType(user.tenantSchema, body) }
  }

  // ── Leave Requests ───────────────────────────────────────────────────────────

  @Get('requests')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List leave requests' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] })
  async getRequests(
    @CurrentUser() user: CurrentUserData,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return { success: true, data: await this.svc.getRequests(user.tenantSchema, employeeId, status) }
  }

  @Post('requests')
  @Audit('leave_request')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Submit a leave request' })
  async createRequest(
    @CurrentUser() user: CurrentUserData,
    @Body() body: {
      employeeId: string
      leaveTypeId: string
      startDate: string
      endDate: string
      days: number
      reason?: string
    },
  ) {
    return { success: true, data: await this.svc.createRequest(user.tenantSchema, body) }
  }

  @Patch('requests/:id/approve')
  @Audit('leave_request', 'APPROVE')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Approve a leave request' })
  async approve(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.approveRequest(user.tenantSchema, id, user.userId) }
  }

  @Patch('requests/:id/reject')
  @Audit('leave_request', 'REJECT')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Reject a leave request' })
  async reject(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return { success: true, data: await this.svc.rejectRequest(user.tenantSchema, id, user.userId, body.reason) }
  }

  // ── Leave Balances ───────────────────────────────────────────────────────────

  @Get('balances/:employeeId')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: "Get an employee's leave balances for a year" })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getBalances(
    @CurrentUser() user: CurrentUserData,
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    return {
      success: true,
      data: await this.svc.getEmployeeBalances(user.tenantSchema, employeeId, year ? Number(year) : undefined),
    }
  }

  @Post('balances/:employeeId/init')
  @Audit('leave_balance')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Initialise leave balances for an employee (tenure-based)' })
  async initBalances(
    @CurrentUser() user: CurrentUserData,
    @Param('employeeId') employeeId: string,
    @Body() body: { year?: number },
  ) {
    const year = body.year ?? new Date().getFullYear()
    await this.svc.initLeaveBalancesForEmployee(user.tenantSchema, employeeId, year)
    return { success: true, message: `Leave balances initialised for ${year}` }
  }

  @Post('balances/init-all')
  @Audit('leave_balance', 'BULK_INIT')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Bulk initialise leave balances for all active employees' })
  async initAllBalances(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { year?: number },
  ) {
    const year = body.year ?? new Date().getFullYear()
    return { success: true, data: await this.svc.initAllEmployeeBalances(user.tenantSchema, year) }
  }

  @Get('pro-rata/:employeeId')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Calculate pro-rata leave for termination' })
  @ApiQuery({ name: 'terminationDate', required: true })
  async proRata(
    @CurrentUser() user: CurrentUserData,
    @Param('employeeId') employeeId: string,
    @Query('terminationDate') terminationDate: string,
  ) {
    return {
      success: true,
      data: await this.svc.calculateProRataLeave(user.tenantSchema, employeeId, terminationDate),
    }
  }
}

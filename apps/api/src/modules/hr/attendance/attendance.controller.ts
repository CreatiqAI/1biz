import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { AttendanceService } from './attendance.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Get('entries/:employeeId')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get work entries for an employee in a date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getEntries(
    @CurrentUser() user: CurrentUserData,
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return { success: true, data: await this.svc.getEntries(user.tenantSchema, employeeId, startDate, endDate) }
  }

  @Get('monthly')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get all work entries for a month (all employees)' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async getMonthlyEntries(
    @CurrentUser() user: CurrentUserData,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return { success: true, data: await this.svc.getMonthlyEntries(user.tenantSchema, Number(year), Number(month)) }
  }

  @Post('entries')
  @Audit('work_entry')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Create/update a work entry (manual entry)' })
  async upsertEntry(
    @CurrentUser() user: CurrentUserData,
    @Body() body: {
      employeeId: string
      date: string
      normalHours?: number
      overtimeHours?: number
      restDayHours?: number
      phHours?: number
      isRestDay?: boolean
      isPublicHoliday?: boolean
      isAbsent?: boolean
      isLate?: boolean
      notes?: string
    },
  ) {
    return { success: true, data: await this.svc.upsertEntry(user.tenantSchema, body, user.userId) }
  }

  @Post('entries/bulk')
  @Audit('work_entry', 'BULK')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Bulk create/update work entries' })
  async bulkUpsert(
    @CurrentUser() user: CurrentUserData,
    @Body() body: {
      entries: Array<{
        employeeId: string
        date: string
        normalHours?: number
        overtimeHours?: number
        restDayHours?: number
        phHours?: number
        isRestDay?: boolean
        isPublicHoliday?: boolean
        isAbsent?: boolean
        isLate?: boolean
        notes?: string
      }>
    },
  ) {
    return { success: true, data: await this.svc.bulkUpsert(user.tenantSchema, body.entries, user.userId) }
  }

  @Delete('entries/:id')
  @Audit('work_entry', 'DELETE')
  @RequirePermissions(Permission.HR_DELETE)
  @ApiOperation({ summary: 'Delete a work entry' })
  async deleteEntry(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.deleteEntry(user.tenantSchema, id) }
  }

  @Get('summary/:employeeId')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get monthly attendance summary for an employee (with OT pay)' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async getMonthlySummary(
    @CurrentUser() user: CurrentUserData,
    @Param('employeeId') employeeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return { success: true, data: await this.svc.getMonthlySummary(user.tenantSchema, employeeId, Number(year), Number(month)) }
  }

  @Get('summaries')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get monthly attendance summaries for all employees' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async getAllSummaries(
    @CurrentUser() user: CurrentUserData,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return { success: true, data: await this.svc.getAllMonthlySummaries(user.tenantSchema, Number(year), Number(month)) }
  }
}

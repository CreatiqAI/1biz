import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { EmployeesService, CreateEmployeeDto } from './employees.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Get()
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List all employees' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PROBATION', 'RESIGNED', 'TERMINATED', 'SUSPENDED'] })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('status') status?: string) {
    return { success: true, data: await this.svc.findAll(user.tenantSchema, status) }
  }

  @Get(':id')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('employee')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Create a new employee' })
  async create(@CurrentUser() user: CurrentUserData, @Body() body: CreateEmployeeDto) {
    return { success: true, data: await this.svc.create(user.tenantSchema, body, user.userId) }
  }

  @Patch(':id')
  @Audit('employee')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Update employee information' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: Partial<CreateEmployeeDto>,
  ) {
    return { success: true, data: await this.svc.update(user.tenantSchema, id, body) }
  }

  @Patch(':id/status')
  @Audit('employee')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Update employee status (resign, terminate, etc.)' })
  async updateStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { status: string; date?: string },
  ) {
    return { success: true, data: await this.svc.updateStatus(user.tenantSchema, id, body.status, body.date) }
  }

  @Delete(':id')
  @Audit('employee')
  @RequirePermissions(Permission.HR_DELETE)
  @ApiOperation({ summary: 'Soft-delete an employee record' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.remove(user.tenantSchema, id) }
  }

  // ── Employment History ────────────────────────────────────────────────────────

  @Get(':id/history')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get employment history for an employee' })
  async getHistory(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.getHistory(user.tenantSchema, id) }
  }

  @Post(':id/job-change')
  @Audit('employment_history')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Record a job change (transfer, promotion, salary revision)' })
  async recordJobChange(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: {
      changeType: 'TRANSFER' | 'PROMOTION' | 'SALARY_CHANGE' | 'DEMOTION'
      effectiveDate: string
      departmentId?: string
      positionId?: string
      employmentType?: string
      basicSalarySen?: number
      reason?: string
    },
  ) {
    return { success: true, data: await this.svc.recordJobChange(user.tenantSchema, id, body, user.userId) }
  }

  @Get(':id/termination-preview')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Preview termination benefits (notice period + benefits calculation)' })
  @ApiQuery({ name: 'terminationDate', required: true })
  async terminationPreview(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('terminationDate') terminationDate: string,
  ) {
    return { success: true, data: await this.svc.calculateTermination(user.tenantSchema, id, terminationDate) }
  }

  @Post(':id/terminate')
  @Audit('employee', 'TERMINATE')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Process employee termination with benefits calculation' })
  async terminate(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { terminationDate: string; reason?: string },
  ) {
    return { success: true, data: await this.svc.processTermination(user.tenantSchema, id, body, user.userId) }
  }
}

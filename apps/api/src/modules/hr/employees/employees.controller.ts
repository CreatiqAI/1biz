import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { Response } from 'express'
import { EmployeesService, CreateEmployeeDto } from './employees.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../../auth/guards/module.guard'
import { RequireModules } from '../../auth/decorators/modules.decorator'
import { Audit } from '../../audit/audit.decorator'
import { toCsv, sendCsv } from '../../../common/export.helper'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.HR)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Get()
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List employees with pagination, search, and optional CSV export' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PROBATION', 'RESIGNED', 'TERMINATED', 'SUSPENDED'] })
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
    const l = limit ? parseInt(limit) : 25
    const result = await this.svc.findAll(user.tenantSchema, status, search, format === 'csv' ? 1 : p, format === 'csv' ? 10000 : l)

    if (format === 'csv' && res) {
      const headers = ['Employee No', 'Name', 'Email', 'Phone', 'Status', 'Department', 'Position', 'Hire Date', 'Salary (RM)']
      const keys = ['employee_no', 'full_name', 'email', 'phone', 'status', 'department_name', 'position_name', 'hire_date', 'salary_rm']
      const rows = (result.data as any[]).map((r: any) => ({ ...r, salary_rm: (Number(r.basic_salary_sen) / 100).toFixed(2) }))
      return sendCsv(res, 'employees.csv', toCsv(headers, rows, keys))
    }

    return { success: true, ...result }
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

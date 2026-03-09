import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DepartmentsService } from './departments.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr/departments')
export class DepartmentsController {
  constructor(private readonly svc: DepartmentsService) {}

  @Get()
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List all departments' })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.svc.findAll(user.tenantSchema) }
  }

  @Get(':id')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('department')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Create a department' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; code?: string; description?: string; parentId?: string },
  ) {
    return { success: true, data: await this.svc.create(user.tenantSchema, body) }
  }

  @Patch(':id')
  @Audit('department')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; description?: string; isActive?: boolean },
  ) {
    return { success: true, data: await this.svc.update(user.tenantSchema, id, body) }
  }

  @Delete(':id')
  @Audit('department')
  @RequirePermissions(Permission.HR_DELETE)
  @ApiOperation({ summary: 'Delete a department' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.remove(user.tenantSchema, id) }
  }
}

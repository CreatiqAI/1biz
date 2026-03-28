import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PositionsService } from './positions.service'
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
@Controller('hr/positions')
export class PositionsController {
  constructor(private readonly svc: PositionsService) {}

  @Get()
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List all positions' })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.svc.findAll(user.tenantSchema) }
  }

  @Post()
  @Audit('position')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Create a position' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; departmentId?: string },
  ) {
    return { success: true, data: await this.svc.create(user.tenantSchema, body) }
  }

  @Patch(':id')
  @Audit('position')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Update a position' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { name?: string; departmentId?: string; isActive?: boolean },
  ) {
    return { success: true, data: await this.svc.update(user.tenantSchema, id, body) }
  }

  @Delete(':id')
  @Audit('position')
  @RequirePermissions(Permission.HR_DELETE)
  @ApiOperation({ summary: 'Delete a position' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.remove(user.tenantSchema, id) }
  }
}

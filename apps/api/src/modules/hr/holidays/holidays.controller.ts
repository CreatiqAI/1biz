import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { HolidaysService } from './holidays.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr/holidays')
export class HolidaysController {
  constructor(private readonly svc: HolidaysService) {}

  @Get()
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List public holidays for a year' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('year') year?: string,
  ) {
    return { success: true, data: await this.svc.findAll(user.tenantSchema, year ? Number(year) : undefined) }
  }

  @Post()
  @Audit('public_holiday')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Add a public holiday' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; date: string; isMandatory?: boolean; state?: string },
  ) {
    return { success: true, data: await this.svc.create(user.tenantSchema, body) }
  }

  @Patch(':id')
  @Audit('public_holiday')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Update a public holiday' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { name?: string; date?: string; isMandatory?: boolean; state?: string },
  ) {
    return { success: true, data: await this.svc.update(user.tenantSchema, id, body) }
  }

  @Delete(':id')
  @Audit('public_holiday', 'DELETE')
  @RequirePermissions(Permission.HR_DELETE)
  @ApiOperation({ summary: 'Remove a public holiday' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.remove(user.tenantSchema, id) }
  }

  @Post('seed')
  @Audit('public_holiday', 'SEED')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Seed default Malaysian public holidays for a year' })
  async seed(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { year?: number },
  ) {
    const year = body.year ?? new Date().getFullYear()
    return { success: true, data: await this.svc.seedYear(user.tenantSchema, year) }
  }
}

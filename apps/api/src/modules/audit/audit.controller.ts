import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { Permission } from '@1biz/shared'

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get audit logs for this tenant' })
  async getLogs(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.auditService.findAll(user.tenantSchema, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      entityType: entityType || undefined,
      userId: userId || undefined,
    })
    return { success: true, data: result }
  }
}

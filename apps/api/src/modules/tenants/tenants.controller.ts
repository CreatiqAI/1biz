import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { TenantsService } from './tenants.service'
import { UpdateTenantSettingsDto } from './dto/update-settings.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings' })
  async getSettings(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      data: await this.tenantsService.getSettings(user.tenantId),
    }
  }

  @Patch('settings')
  @Audit('settings')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({ summary: 'Update company settings' })
  async updateSettings(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return {
      success: true,
      data: await this.tenantsService.updateSettings(user.tenantId, dto),
      message: 'Settings updated successfully',
    }
  }

  @Get('users')
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'List all users in this company' })
  async getUsers(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      data: await this.tenantsService.getTenantUsers(user.tenantId),
    }
  }
}

import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { SystemRole } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics (super admin only)' })
  async getStats() {
    return { success: true, data: await this.adminService.getPlatformStats() }
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (super admin only)' })
  async listTenants() {
    return { success: true, data: await this.adminService.listTenants() }
  }

  @Patch('tenants/:id/toggle-active')
  @Audit('tenant', 'TOGGLE')
  @ApiOperation({ summary: 'Toggle tenant active status (super admin only)' })
  async toggleTenantActive(@Param('id') id: string) {
    return {
      success: true,
      data: await this.adminService.toggleTenantActive(id),
      message: 'Tenant status updated',
    }
  }
}

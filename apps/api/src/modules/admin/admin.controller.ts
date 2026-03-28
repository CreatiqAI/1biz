import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { SystemRole } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'
import { AppModule } from '@prisma/client'

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

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant detail with modules and users' })
  async getTenantDetail(@Param('id') id: string) {
    return { success: true, data: await this.adminService.getTenantDetail(id) }
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

  @Patch('tenants/:id/modules')
  @Audit('tenant', 'UPDATE')
  @ApiOperation({ summary: 'Update tenant module access' })
  async updateTenantModules(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() body: { modules: { module: AppModule; isActive: boolean }[] },
  ) {
    return {
      success: true,
      data: await this.adminService.updateTenantModules(id, body.modules, user.userId),
      message: 'Modules updated',
    }
  }

  @Patch('tenants/:id/pricing-model')
  @Audit('tenant', 'UPDATE')
  @ApiOperation({ summary: 'Switch tenant between FLAT and MODULAR pricing' })
  async switchPricingModel(
    @Param('id') id: string,
    @Body() body: { model: 'FLAT' | 'MODULAR' },
  ) {
    return {
      success: true,
      data: await this.adminService.switchPricingModel(id, body.model),
      message: `Pricing model switched to ${body.model}`,
    }
  }

  // ─── Module Pricing ──────────────────────────────────────────────────────

  @Get('modules')
  @ApiOperation({ summary: 'List module pricing catalog' })
  async listModulePricing() {
    return { success: true, data: await this.adminService.listModulePricing() }
  }

  @Post('modules/:module')
  @Audit('module_pricing', 'UPDATE')
  @ApiOperation({ summary: 'Create or update module pricing' })
  async upsertModulePricing(
    @Param('module') module: AppModule,
    @Body() body: { name: string; description?: string; monthlyPrice: number; yearlyPrice: number; isActive?: boolean; sortOrder?: number },
  ) {
    return {
      success: true,
      data: await this.adminService.upsertModulePricing(module, body),
      message: 'Module pricing updated',
    }
  }
}

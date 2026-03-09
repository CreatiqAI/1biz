import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.dashboardService.getStats(user.tenantSchema) }
  }

  @Get('accounting')
  @ApiOperation({ summary: 'Get accounting overview statistics' })
  async getAccountingStats(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.dashboardService.getAccountingStats(user.tenantSchema) }
  }

  @Get('hr')
  @ApiOperation({ summary: 'Get HR overview statistics' })
  async getHrStats(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.dashboardService.getHrStats(user.tenantSchema) }
  }
}

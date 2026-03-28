import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ComplianceService, CreateObligationDto } from './compliance.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../auth/guards/module.guard'
import { RequireModules } from '../auth/decorators/modules.decorator'
import { Audit } from '../audit/audit.decorator'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.ACCOUNTING)
@Controller('accounting/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('obligations')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List compliance obligations with optional filters' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year (e.g. 2026)' })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by month (1-12)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (UPCOMING, DUE_SOON, OVERDUE, COMPLETED)' })
  async getObligations(
    @CurrentUser() user: CurrentUserData,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    return {
      success: true,
      data: await this.complianceService.getObligations(
        user.tenantSchema,
        year ? parseInt(year, 10) : undefined,
        month ? parseInt(month, 10) : undefined,
        status,
      ),
    }
  }

  @Post('obligations')
  @Audit('compliance_obligation')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a manual compliance obligation' })
  async createObligation(@CurrentUser() user: CurrentUserData, @Body() dto: CreateObligationDto) {
    return {
      success: true,
      data: await this.complianceService.createObligation(user.tenantSchema, dto),
      message: 'Compliance obligation created successfully',
    }
  }

  @Patch('obligations/:id/complete')
  @Audit('compliance_obligation')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Mark a compliance obligation as completed' })
  async completeObligation(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.complianceService.completeObligation(user.tenantSchema, id, user.userId),
      message: 'Compliance obligation marked as completed',
    }
  }

  @Post('generate-monthly')
  @Audit('compliance_obligation', 'GENERATE')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Generate standard monthly compliance obligations' })
  async generateMonthly(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { year: number; month: number },
  ) {
    return {
      success: true,
      data: await this.complianceService.generateMonthlyObligations(
        user.tenantSchema,
        body.year,
        body.month,
      ),
      message: 'Monthly compliance obligations generated successfully',
    }
  }

  @Post('generate-annual')
  @Audit('compliance_obligation', 'GENERATE')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Generate annual compliance obligations' })
  async generateAnnual(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { year: number; incorporationDate: string; fyeMonth: number },
  ) {
    return {
      success: true,
      data: await this.complianceService.generateAnnualObligations(
        user.tenantSchema,
        body.year,
        body.incorporationDate,
        body.fyeMonth,
      ),
      message: 'Annual compliance obligations generated successfully',
    }
  }

  @Get('dashboard')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get compliance dashboard summary' })
  async getDashboard(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      data: await this.complianceService.getDashboard(user.tenantSchema),
    }
  }
}

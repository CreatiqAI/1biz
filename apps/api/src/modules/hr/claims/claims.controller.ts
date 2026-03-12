import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ClaimsService } from './claims.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../../audit/audit.decorator'

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr/claims')
export class ClaimsController {
  constructor(private readonly svc: ClaimsService) {}

  // ── Claim Types ──────────────────────────────────────────────────────────────

  @Get('types')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List claim types' })
  async getClaimTypes(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.svc.getClaimTypes(user.tenantSchema) }
  }

  @Post('types')
  @Audit('claim_type')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Create a claim type' })
  async createClaimType(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; code: string; description?: string; requiresReceipt?: boolean; isTaxable?: boolean; monthlyLimitSen?: number },
  ) {
    return { success: true, data: await this.svc.createClaimType(user.tenantSchema, body) }
  }

  // ── Claims ───────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'List claims' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return { success: true, data: await this.svc.findAll(user.tenantSchema, employeeId, status) }
  }

  @Get(':id')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get a claim with line items' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.findOneWithLines(user.tenantSchema, id) }
  }

  @Post()
  @Audit('claim')
  @RequirePermissions(Permission.HR_CREATE)
  @ApiOperation({ summary: 'Submit a new expense claim' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() body: {
      employeeId: string
      claimDate: string
      notes?: string
      lines: Array<{
        claimTypeId: string
        description: string
        amountSen: number
        receiptUrl?: string
        date: string
      }>
    },
  ) {
    return { success: true, data: await this.svc.create(user.tenantSchema, body) }
  }

  @Patch(':id/approve')
  @Audit('claim', 'APPROVE')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Approve a claim' })
  async approve(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.svc.approve(user.tenantSchema, id, user.userId) }
  }

  @Patch(':id/reject')
  @Audit('claim', 'REJECT')
  @RequirePermissions(Permission.HR_UPDATE)
  @ApiOperation({ summary: 'Reject a claim' })
  async reject(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return { success: true, data: await this.svc.reject(user.tenantSchema, id, user.userId, body.reason) }
  }

  @Get('unpaid/:employeeId')
  @RequirePermissions(Permission.HR_VIEW)
  @ApiOperation({ summary: 'Get total approved but unpaid claims for an employee' })
  async getUnpaidTotal(
    @CurrentUser() user: CurrentUserData,
    @Param('employeeId') employeeId: string,
  ) {
    return { success: true, data: await this.svc.getApprovedUnpaidTotal(user.tenantSchema, employeeId) }
  }
}

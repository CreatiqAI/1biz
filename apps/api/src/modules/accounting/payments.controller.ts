import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PaymentsService, RecordPaymentDto } from './payments.service'
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
@Controller('accounting/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List all payments' })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('type') type?: string) {
    return { success: true, data: await this.paymentsService.findAll(user.tenantSchema, type) }
  }

  @Post()
  @Audit('payment')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Record a payment' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: RecordPaymentDto) {
    return {
      success: true,
      data: await this.paymentsService.create(user.tenantSchema, dto, user.userId),
      message: 'Payment recorded successfully',
    }
  }
}

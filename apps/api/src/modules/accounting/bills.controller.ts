import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { BillsService, CreateBillDto, RecordBillPaymentDto } from './bills.service'
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
@Controller('accounting/bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List bills' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('status') status?: string) {
    const result = await this.billsService.findAll(user.tenantSchema, status)
    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get bill by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.billsService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('bill')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new bill' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateBillDto) {
    return {
      success: true,
      data: await this.billsService.create(user.tenantSchema, dto, user.userId),
      message: 'Bill created successfully',
    }
  }

  @Patch(':id/approve')
  @Audit('bill')
  @RequirePermissions(Permission.ACCOUNTING_APPROVE)
  @ApiOperation({ summary: 'Approve a bill' })
  async approve(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.billsService.approve(user.tenantSchema, id, user.userId),
      message: 'Bill approved successfully',
    }
  }

  @Post(':id/pay')
  @Audit('bill')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Record payment against a bill' })
  async recordPayment(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: RecordBillPaymentDto,
  ) {
    return {
      success: true,
      data: await this.billsService.recordPayment(user.tenantSchema, id, dto, user.userId),
      message: 'Payment recorded successfully',
    }
  }

  @Patch(':id/status')
  @Audit('bill')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Update bill status' })
  async updateStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return { success: true, data: await this.billsService.updateStatus(user.tenantSchema, id, body.status) }
  }

  @Delete(':id')
  @Audit('bill')
  @RequirePermissions(Permission.ACCOUNTING_DELETE)
  @ApiOperation({ summary: 'Soft delete a bill (DRAFT only)' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.billsService.delete(user.tenantSchema, id),
      message: 'Bill deleted successfully',
    }
  }
}

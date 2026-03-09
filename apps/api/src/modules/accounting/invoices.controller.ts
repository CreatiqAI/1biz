import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { InvoicesService, CreateInvoiceDto } from './invoices.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('status') status?: string) {
    return { success: true, data: await this.invoicesService.findAll(user.tenantSchema, status) }
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.invoicesService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('invoice')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateInvoiceDto) {
    return {
      success: true,
      data: await this.invoicesService.create(user.tenantSchema, dto, user.userId, user.tenantId),
      message: 'Invoice created successfully',
    }
  }

  @Patch(':id/status')
  @Audit('invoice')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Update invoice status (SENT, CANCELLED)' })
  async updateStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return { success: true, data: await this.invoicesService.updateStatus(user.tenantSchema, id, body.status, user.userId) }
  }
}

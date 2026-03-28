import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { QuotationsService, CreateQuotationDto } from './quotations.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../auth/guards/module.guard'
import { RequireModules } from '../auth/decorators/modules.decorator'
import { Audit } from '../audit/audit.decorator'

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.CRM)
@Controller('crm/quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @ApiOperation({ summary: 'List quotations' })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('status') status?: string) {
    return { success: true, data: await this.quotationsService.findAll(user.tenantSchema, status) }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.quotationsService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('quotation')
  @ApiOperation({ summary: 'Create quotation' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateQuotationDto) {
    return {
      success: true,
      data: await this.quotationsService.create(user.tenantSchema, dto, user.userId, user.tenantId),
    }
  }

  @Patch(':id/status')
  @Audit('quotation')
  @ApiOperation({ summary: 'Update quotation status' })
  async updateStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return { success: true, data: await this.quotationsService.updateStatus(user.tenantSchema, id, body.status) }
  }
}

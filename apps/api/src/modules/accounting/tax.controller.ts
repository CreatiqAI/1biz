import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { TaxService, CreateTaxCodeDto, UpdateTaxCodeDto } from './tax.service'
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
@Controller('accounting/tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('codes')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List all tax codes' })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.taxService.findAll(user.tenantSchema) }
  }

  @Get('codes/active')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List active tax codes for a given date' })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format (defaults to today)' })
  async findActive(@CurrentUser() user: CurrentUserData, @Query('date') date?: string) {
    return { success: true, data: await this.taxService.findActive(user.tenantSchema, date) }
  }

  @Post('codes')
  @Audit('tax_code')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new tax code' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateTaxCodeDto) {
    return {
      success: true,
      data: await this.taxService.create(user.tenantSchema, dto),
      message: 'Tax code created successfully',
    }
  }

  @Patch('codes/:id')
  @Audit('tax_code')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Update a tax code' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateTaxCodeDto,
  ) {
    return {
      success: true,
      data: await this.taxService.update(user.tenantSchema, id, dto),
      message: 'Tax code updated successfully',
    }
  }

  @Delete('codes/:id')
  @Audit('tax_code')
  @RequirePermissions(Permission.ACCOUNTING_DELETE)
  @ApiOperation({ summary: 'Delete a tax code' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.taxService.delete(user.tenantSchema, id),
      message: 'Tax code deleted successfully',
    }
  }

  @Get('resolve')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Resolve the correct SST rate for a transaction' })
  @ApiQuery({ name: 'taxType', required: true, description: 'SERVICE or SALES' })
  @ApiQuery({ name: 'category', required: false, description: 'Service category (e.g. FOOD_BEVERAGE, TELECOMMUNICATION)' })
  @ApiQuery({ name: 'date', required: false, description: 'Transaction date in YYYY-MM-DD format (defaults to today)' })
  async resolveRate(
    @CurrentUser() user: CurrentUserData,
    @Query('taxType') taxType: string,
    @Query('category') category?: string,
    @Query('date') date?: string,
  ) {
    return {
      success: true,
      data: await this.taxService.resolveRate(user.tenantSchema, taxType, category, date),
    }
  }

  @Post('seed')
  @Audit('tax_code', 'SEED')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Seed default Malaysian SST tax codes' })
  async seed(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      data: await this.taxService.seedDefaultCodes(user.tenantSchema),
      message: 'Default SST tax codes seeded successfully',
    }
  }
}

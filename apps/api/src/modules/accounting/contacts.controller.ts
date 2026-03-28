import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { Response } from 'express'
import { ContactsService, CreateContactDto } from './contacts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../auth/guards/module.guard'
import { RequireModules } from '../auth/decorators/modules.decorator'
import { Audit } from '../audit/audit.decorator'
import { toCsv, sendCsv } from '../../common/export.helper'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.ACCOUNTING)
@Controller('accounting/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List contacts with pagination, search, and optional CSV export' })
  @ApiQuery({ name: 'type', required: false, enum: ['CUSTOMER', 'SUPPLIER', 'BOTH'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'format', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const p = page ? parseInt(page) : 1
    const l = limit ? parseInt(limit) : 25
    const result = await this.contactsService.findAll(user.tenantSchema, type, search, format === 'csv' ? 1 : p, format === 'csv' ? 10000 : l)

    if (format === 'csv' && res) {
      const headers = ['Name', 'Type', 'Company', 'Email', 'Phone', 'City', 'State']
      const keys = ['name', 'type', 'company_name', 'email', 'phone', 'city', 'state']
      return sendCsv(res, 'contacts.csv', toCsv(headers, result.data as any[], keys))
    }

    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.contactsService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('contact')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a contact' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateContactDto) {
    return { success: true, data: await this.contactsService.create(user.tenantSchema, dto, user.userId) }
  }

  @Delete(':id')
  @Audit('contact')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Delete a contact (soft delete)' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.contactsService.remove(user.tenantSchema, id) }
  }
}

import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ContactsService, CreateContactDto } from './contacts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List contacts (customers/suppliers)' })
  @ApiQuery({ name: 'type', required: false, enum: ['CUSTOMER', 'SUPPLIER', 'BOTH'] })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('type') type?: string) {
    return { success: true, data: await this.contactsService.findAll(user.tenantSchema, type) }
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

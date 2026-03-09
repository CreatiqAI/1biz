import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { LeadsService, CreateLeadDto } from './leads.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { Audit } from '../audit/audit.decorator'

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads' })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('status') status?: string) {
    return { success: true, data: await this.leadsService.findAll(user.tenantSchema, status) }
  }

  @Post()
  @Audit('lead')
  @ApiOperation({ summary: 'Create lead' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateLeadDto) {
    return { success: true, data: await this.leadsService.create(user.tenantSchema, dto, user.userId) }
  }

  @Patch(':id')
  @Audit('lead')
  @ApiOperation({ summary: 'Update lead' })
  async update(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.leadsService.update(user.tenantSchema, id, dto) }
  }

  @Delete(':id')
  @Audit('lead')
  @ApiOperation({ summary: 'Delete lead' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.leadsService.remove(user.tenantSchema, id) }
  }
}

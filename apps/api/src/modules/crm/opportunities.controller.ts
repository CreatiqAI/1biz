import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { OpportunitiesService, CreateOpportunityDto } from './opportunities.service'
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
@Controller('crm/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List opportunities' })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('stage') stage?: string) {
    return { success: true, data: await this.opportunitiesService.findAll(user.tenantSchema, stage) }
  }

  @Post()
  @Audit('opportunity')
  @ApiOperation({ summary: 'Create opportunity' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateOpportunityDto) {
    return { success: true, data: await this.opportunitiesService.create(user.tenantSchema, dto, user.userId) }
  }

  @Patch(':id')
  @Audit('opportunity')
  @ApiOperation({ summary: 'Update opportunity' })
  async update(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.opportunitiesService.update(user.tenantSchema, id, dto) }
  }
}

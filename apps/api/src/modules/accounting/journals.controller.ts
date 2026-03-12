import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JournalsService, CreateJournalEntryDto } from './journals.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/journals')
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('status') status?: string) {
    return { success: true, data: await this.journalsService.findAll(user.tenantSchema, status) }
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get journal entry by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.journalsService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('journal_entry')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new journal entry' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateJournalEntryDto) {
    return {
      success: true,
      data: await this.journalsService.create(user.tenantSchema, dto, user.userId),
      message: 'Journal entry created successfully',
    }
  }

  @Post(':id/post')
  @Audit('journal_entry')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Post a draft journal entry' })
  async post(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.journalsService.post(user.tenantSchema, id, user.userId),
      message: 'Journal entry posted successfully',
    }
  }

  @Post(':id/reverse')
  @Audit('journal_entry')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Reverse a posted journal entry' })
  async reverse(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.journalsService.reverse(user.tenantSchema, id, user.userId),
      message: 'Journal entry reversed successfully',
    }
  }

  @Delete(':id')
  @Audit('journal_entry')
  @RequirePermissions(Permission.ACCOUNTING_DELETE)
  @ApiOperation({ summary: 'Soft delete a draft journal entry' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return await this.journalsService.delete(user.tenantSchema, id)
  }
}

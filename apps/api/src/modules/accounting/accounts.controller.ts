import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AccountsService } from './accounts.service'
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
@Controller('accounting/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List chart of accounts' })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.accountsService.findAll(user.tenantSchema) }
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get account by ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.accountsService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('account')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a new account' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { code: string; name: string; type: string; subType?: string },
  ) {
    return { success: true, data: await this.accountsService.create(user.tenantSchema, body, user.userId) }
  }
}

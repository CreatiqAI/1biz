import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import {
  BankingService,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateBankTransactionDto,
  ImportBankTransactionRow,
  StartReconSessionDto,
} from './banking.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  // ── Bank Accounts ─────────────────────────────────────────────────

  @Get('accounts')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List bank accounts' })
  async findAllAccounts(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.bankingService.findAllAccounts(user.tenantSchema) }
  }

  @Get('accounts/:id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get bank account by ID' })
  async findOneAccount(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.bankingService.findOneAccount(user.tenantSchema, id) }
  }

  @Post('accounts')
  @Audit('bank_account')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a bank account' })
  async createAccount(@CurrentUser() user: CurrentUserData, @Body() dto: CreateBankAccountDto) {
    return {
      success: true,
      data: await this.bankingService.createAccount(user.tenantSchema, dto, user.userId),
      message: 'Bank account created successfully',
    }
  }

  @Patch('accounts/:id')
  @Audit('bank_account')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Update a bank account' })
  async updateAccount(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return {
      success: true,
      data: await this.bankingService.updateAccount(user.tenantSchema, id, dto),
      message: 'Bank account updated successfully',
    }
  }

  @Delete('accounts/:id')
  @Audit('bank_account')
  @RequirePermissions(Permission.ACCOUNTING_DELETE)
  @ApiOperation({ summary: 'Soft delete a bank account' })
  async deleteAccount(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.bankingService.deleteAccount(user.tenantSchema, id),
      message: 'Bank account deleted successfully',
    }
  }

  // ── Bank Transactions ─────────────────────────────────────────────

  @Get('transactions/:bankAccountId')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List bank transactions for an account' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Param('bankAccountId') bankAccountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return {
      success: true,
      data: await this.bankingService.getTransactions(user.tenantSchema, bankAccountId, startDate, endDate),
    }
  }

  @Post('transactions/:bankAccountId/import')
  @Audit('bank_transaction', 'IMPORT')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Bulk import bank transactions (from CSV parse)' })
  async importTransactions(
    @CurrentUser() user: CurrentUserData,
    @Param('bankAccountId') bankAccountId: string,
    @Body() body: { transactions: ImportBankTransactionRow[] },
  ) {
    return {
      success: true,
      data: await this.bankingService.importTransactions(user.tenantSchema, bankAccountId, body.transactions),
      message: 'Transactions imported successfully',
    }
  }

  @Post('transactions')
  @Audit('bank_transaction')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create a manual bank transaction' })
  async createTransaction(@CurrentUser() user: CurrentUserData, @Body() dto: CreateBankTransactionDto) {
    return {
      success: true,
      data: await this.bankingService.createTransaction(user.tenantSchema, dto),
      message: 'Bank transaction created successfully',
    }
  }

  @Post('transactions/:id/match')
  @Audit('bank_transaction', 'MATCH')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Match a bank transaction to a payment' })
  async matchTransaction(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { paymentId: string },
  ) {
    return {
      success: true,
      data: await this.bankingService.matchTransaction(user.tenantSchema, id, body.paymentId),
      message: 'Transaction matched successfully',
    }
  }

  @Post('transactions/:id/unmatch')
  @Audit('bank_transaction', 'UNMATCH')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @ApiOperation({ summary: 'Unmatch a bank transaction from a payment' })
  async unmatchTransaction(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.bankingService.unmatchTransaction(user.tenantSchema, id),
      message: 'Transaction unmatched successfully',
    }
  }

  // ── Reconciliation ────────────────────────────────────────────────

  @Get('reconcile/:bankAccountId')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get unreconciled items for a bank account' })
  async getUnreconciled(@CurrentUser() user: CurrentUserData, @Param('bankAccountId') bankAccountId: string) {
    return {
      success: true,
      data: await this.bankingService.getUnreconciled(user.tenantSchema, bankAccountId),
    }
  }

  @Post('reconcile')
  @Audit('recon_session')
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Start a reconciliation session' })
  async startReconSession(@CurrentUser() user: CurrentUserData, @Body() dto: StartReconSessionDto) {
    return {
      success: true,
      data: await this.bankingService.startReconSession(user.tenantSchema, dto, user.userId),
      message: 'Reconciliation session started',
    }
  }

  @Post('reconcile/:id/complete')
  @Audit('recon_session', 'COMPLETE')
  @RequirePermissions(Permission.ACCOUNTING_APPROVE)
  @ApiOperation({ summary: 'Complete a reconciliation session' })
  async completeReconSession(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return {
      success: true,
      data: await this.bankingService.completeReconSession(user.tenantSchema, id, user.userId),
      message: 'Reconciliation session completed',
    }
  }
}

import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MyInvoisService } from './myinvois.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { AppModule } from '@prisma/client'
import { ModuleGuard } from '../auth/guards/module.guard'
import { RequireModules } from '../auth/decorators/modules.decorator'
import { Audit } from '../audit/audit.decorator'

@ApiTags('myinvois')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModules(AppModule.ACCOUNTING)
@Controller('accounting/myinvois')
export class MyInvoisController {
  constructor(private readonly myInvoisService: MyInvoisService) {}

  @Post('submit/:invoiceId')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @Audit('invoice', 'SUBMIT_EINVOICE')
  @ApiOperation({ summary: 'Submit invoice to LHDN MyInvois' })
  async submitInvoice(
    @Param('invoiceId') invoiceId: string,
    @Req() req: any,
  ) {
    const result = await this.myInvoisService.submitInvoice(
      req.user.tenantSchema,
      req.user.tenantId,
      invoiceId,
      req.user.userId,
    )
    return {
      success: true,
      data: result,
      message: 'Invoice submitted to LHDN. Status will be updated automatically.',
    }
  }

  @Get('status/:invoiceId')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get e-invoice status for an invoice' })
  async getStatus(
    @Param('invoiceId') invoiceId: string,
    @Req() req: any,
  ) {
    const result = await this.myInvoisService.getEInvoiceStatus(
      req.user.tenantSchema,
      invoiceId,
    )
    return { success: true, data: result }
  }

  @Post('cancel/:invoiceId')
  @RequirePermissions(Permission.ACCOUNTING_UPDATE)
  @Audit('invoice', 'CANCEL_EINVOICE')
  @ApiOperation({ summary: 'Cancel a validated e-invoice on LHDN' })
  async cancelEInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    await this.myInvoisService.cancelEInvoice(
      req.user.tenantSchema,
      req.user.tenantId,
      invoiceId,
      body.reason,
    )
    return { success: true, message: 'E-invoice cancelled on LHDN' }
  }

  @Get('validate-tin/:tin')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Validate a taxpayer TIN against LHDN' })
  async validateTIN(
    @Param('tin') tin: string,
    @Body() body: { idType: 'BRN' | 'NRIC' | 'PASSPORT' | 'ARMY'; idValue: string },
    @Req() req: any,
  ) {
    const valid = await this.myInvoisService.validateTIN(
      req.user.tenantId,
      tin,
      body.idType,
      body.idValue,
    )
    return { success: true, data: { valid } }
  }
}

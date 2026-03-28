import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller'
import { AccountsService } from './accounts.service'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { BillsController } from './bills.controller'
import { BillsService } from './bills.service'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'
import { JournalsController } from './journals.controller'
import { JournalsService } from './journals.service'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { TaxController } from './tax.controller'
import { TaxService } from './tax.service'
import { ComplianceController } from './compliance.controller'
import { ComplianceService } from './compliance.service'
import { MyInvoisController } from './myinvois.controller'
import { MyInvoisService } from './myinvois.service'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [InventoryModule],
  controllers: [AccountsController, ContactsController, InvoicesController, PaymentsController, BillsController, ReportsController, JournalsController, BankingController, TaxController, ComplianceController, MyInvoisController],
  providers: [AccountsService, ContactsService, InvoicesService, PaymentsService, BillsService, ReportsService, JournalsService, BankingService, TaxService, ComplianceService, MyInvoisService],
  exports: [AccountsService, ContactsService, InvoicesService, PaymentsService, BillsService, ReportsService, JournalsService, BankingService, TaxService, ComplianceService, MyInvoisService],
})
export class AccountingModule {}

import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller'
import { AccountsService } from './accounts.service'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [InventoryModule],
  controllers: [AccountsController, ContactsController, InvoicesController, PaymentsController],
  providers: [AccountsService, ContactsService, InvoicesService, PaymentsService],
  exports: [AccountsService, ContactsService, InvoicesService, PaymentsService],
})
export class AccountingModule {}

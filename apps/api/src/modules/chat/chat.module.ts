import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { AccountingModule } from '../accounting/accounting.module'
import { InventoryModule } from '../inventory/inventory.module'
import { HrModule } from '../hr/hr.module'
import { CrmModule } from '../crm/crm.module'
import { DashboardModule } from '../dashboard/dashboard.module'

@Module({
  imports: [
    AccountingModule,
    InventoryModule,
    HrModule,
    CrmModule,
    DashboardModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

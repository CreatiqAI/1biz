import { Module } from '@nestjs/common'
import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'
import { OpportunitiesController } from './opportunities.controller'
import { OpportunitiesService } from './opportunities.service'
import { QuotationsController } from './quotations.controller'
import { QuotationsService } from './quotations.service'

@Module({
  controllers: [LeadsController, OpportunitiesController, QuotationsController],
  providers: [LeadsService, OpportunitiesService, QuotationsService],
  exports: [LeadsService, OpportunitiesService, QuotationsService],
})
export class CrmModule {}

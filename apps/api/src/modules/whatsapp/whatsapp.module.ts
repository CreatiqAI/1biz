import { Module } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'
import { WhatsAppController } from './whatsapp.controller'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [ChatModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}

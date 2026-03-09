import { Global, Module } from '@nestjs/common'
import { AuditService } from './audit.service'
import { AuditController } from './audit.controller'
import { AuditInterceptor } from './audit.interceptor'
import { PrismaModule } from '../../prisma/prisma.module'

@Global() // Make AuditService + AuditInterceptor available everywhere without importing
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}

import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { TenantSchemaService } from './tenant-schema.service'

@Global()
@Module({
  providers: [PrismaService, TenantSchemaService],
  exports: [PrismaService, TenantSchemaService],
})
export class PrismaModule {}

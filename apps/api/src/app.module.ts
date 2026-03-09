import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { UsersModule } from './modules/users/users.module'
import { AccountingModule } from './modules/accounting/accounting.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { HrModule } from './modules/hr/hr.module'
import { HealthModule } from './modules/health/health.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { CrmModule } from './modules/crm/crm.module'
import { ChatModule } from './modules/chat/chat.module'
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module'
import { AdminModule } from './modules/admin/admin.module'
import { AuditModule } from './modules/audit/audit.module'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AuditInterceptor } from './modules/audit/audit.interceptor'

@Module({
  imports: [
    // Config — load .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting — 100 requests per minute per IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: 60000,
          limit: config.get('NODE_ENV') === 'production' ? 100 : 1000,
        },
      ],
    }),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    AccountingModule,
    InventoryModule,
    HrModule,
    HealthModule,
    DashboardModule,
    CrmModule,
    ChatModule,
    WhatsAppModule,
    AdminModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

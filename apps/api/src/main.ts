// Prisma returns BIGINT columns as JS BigInt — patch JSON serialization globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(BigInt.prototype as any).toJSON = function () { return Number(this) }

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import compression from 'compression'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 3001)
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000')

  // Security headers
  app.use(helmet())

  // Compression
  app.use(compression())

  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  })

  // Global prefix
  app.setGlobalPrefix('api/v1')

  // Validation pipe — auto-validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // auto-transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // Swagger API docs (disable in production)
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('1Biz API')
      .setDescription('Your Second You for Business — API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('users', 'User management')
      .addTag('accounting', 'Accounting module')
      .addTag('inventory', 'Inventory module')
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
  }

  await app.listen(port)
  console.log(`1Biz API running on http://localhost:${port}`)
  console.log(`Swagger docs: http://localhost:${port}/api/docs`)
}

bootstrap()

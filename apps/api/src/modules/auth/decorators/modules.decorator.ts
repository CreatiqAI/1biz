import { SetMetadata } from '@nestjs/common'
import { AppModule } from '@prisma/client'

export const MODULES_KEY = 'required_modules'
export const RequireModules = (...modules: AppModule[]) => SetMetadata(MODULES_KEY, modules)

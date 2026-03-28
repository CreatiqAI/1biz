import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppModule, PricingModel } from '@prisma/client'
import { MODULES_KEY } from '../decorators/modules.decorator'
import { PrismaService } from '../../../prisma/prisma.service'
import { SystemRole, PLAN_MODULES, AppModule as SharedAppModule } from '@1biz/shared'

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<AppModule[]>(MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No module restriction set
    if (!requiredModules || requiredModules.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new ForbiddenException('Access denied')

    // Super admin bypasses
    const userRoles: string[] = user.roles ?? []
    if (userRoles.includes(SystemRole.SUPER_ADMIN)) return true

    // Get tenant with plan and pricing model
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { plan: true, pricingModel: true },
    })
    if (!tenant) throw new ForbiddenException('Tenant not found')

    let enabledModules: string[]

    if (tenant.pricingModel === PricingModel.FLAT) {
      // Derive modules from plan
      enabledModules = PLAN_MODULES[tenant.plan] ?? []
    } else {
      // Modular pricing — query TenantModule
      const tenantModules = await this.prisma.tenantModule.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { module: true },
      })
      enabledModules = tenantModules.map((m) => m.module)
    }

    // Check all required modules are enabled
    const hasAll = requiredModules.every((m) => enabledModules.includes(m))
    if (!hasAll) {
      throw new ForbiddenException('This module is not enabled for your company. Contact your admin to subscribe.')
    }

    return true
  }
}

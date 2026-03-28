import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AppModule } from '@prisma/client'
import { PLAN_MODULES } from '@1biz/shared'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [tenantCount, userCount, planDistribution, moduleAdoption] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.tenant.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
      this.prisma.tenantModule.groupBy({
        by: ['module'],
        where: { isActive: true },
        _count: { id: true },
      }),
    ])

    return {
      tenantCount,
      userCount,
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count.id,
      })),
      moduleAdoption: moduleAdoption.map((m) => ({
        module: m.module,
        count: m._count.id,
      })),
    }
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        _count: { select: { users: true } },
        settings: { select: { companyName: true } },
        modules: { select: { module: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getTenantDetail(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
        modules: true,
        users: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true, isActive: true, lastLoginAt: true },
            },
          },
        },
        subscription: true,
      },
    })
    if (!tenant) throw new NotFoundException('Tenant not found')

    // Resolve effective modules (from plan or explicit)
    const effectiveModules = tenant.pricingModel === 'FLAT'
      ? PLAN_MODULES[tenant.plan] ?? []
      : tenant.modules.filter((m) => m.isActive).map((m) => m.module)

    return { ...tenant, effectiveModules }
  }

  async updateTenantModules(tenantId: string, modules: { module: AppModule; isActive: boolean }[], userId: string) {
    const results = []
    for (const mod of modules) {
      const result = await this.prisma.tenantModule.upsert({
        where: { tenantId_module: { tenantId, module: mod.module } },
        create: {
          tenantId,
          module: mod.module,
          isActive: mod.isActive,
          enabledBy: userId,
        },
        update: {
          isActive: mod.isActive,
          disabledAt: mod.isActive ? null : new Date(),
        },
      })
      results.push(result)
    }
    return results
  }

  async switchPricingModel(tenantId: string, model: 'FLAT' | 'MODULAR') {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })

    // When switching to MODULAR, auto-create TenantModule records from current plan
    if (model === 'MODULAR' && tenant.pricingModel === 'FLAT') {
      const planModules = PLAN_MODULES[tenant.plan] ?? []
      for (const mod of planModules) {
        await this.prisma.tenantModule.upsert({
          where: { tenantId_module: { tenantId, module: mod as AppModule } },
          create: { tenantId, module: mod as AppModule, isActive: true },
          update: { isActive: true },
        })
      }
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { pricingModel: model },
    })
  }

  async toggleTenantActive(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    })
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: !tenant.isActive },
    })
  }

  // ─── Module Pricing ──────────────────────────────────────────────────────

  async listModulePricing() {
    return this.prisma.modulePricing.findMany({
      orderBy: { sortOrder: 'asc' },
    })
  }

  async upsertModulePricing(module: AppModule, data: {
    name: string
    description?: string
    monthlyPrice: number
    yearlyPrice: number
    isActive?: boolean
    sortOrder?: number
  }) {
    return this.prisma.modulePricing.upsert({
      where: { module },
      create: {
        module,
        name: data.name,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
      update: {
        name: data.name,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })
  }
}

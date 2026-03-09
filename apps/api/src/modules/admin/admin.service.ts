import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [tenantCount, userCount, planDistribution] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.tenant.groupBy({
        by: ['plan'],
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
    }
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        _count: { select: { users: true } },
        settings: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
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
}

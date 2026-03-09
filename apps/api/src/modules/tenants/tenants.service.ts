import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateTenantSettingsDto } from './dto/update-settings.dto'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      include: { tenant: { select: { name: true, slug: true, plan: true, trialEndsAt: true } } },
    })
    if (!settings) throw new NotFoundException('Tenant settings not found')
    return settings
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    return this.prisma.tenantSettings.update({
      where: { tenantId },
      data: dto,
    })
  }

  async getTenantUsers(tenantId: string) {
    return this.prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    })
  }
}

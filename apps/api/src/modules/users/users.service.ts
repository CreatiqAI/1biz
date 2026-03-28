import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { InviteUserDto } from './dto/invite-user.dto'
import { UpdateUserRolesDto } from './dto/update-user-roles.dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        updatedAt: true,
      },
    })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) throw new ConflictException('Current password is incorrect')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    // Revoke all refresh tokens — forces re-login on all devices
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async inviteUser(tenantId: string, dto: InviteUserDto) {
    // Check if user already exists
    let user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })

    let isNewUser = false
    let tempPassword: string | undefined

    if (!user) {
      isNewUser = true
      tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
      const passwordHash = await bcrypt.hash(tempPassword, 12)
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          fullName: dto.fullName,
        },
      })
    } else {
      // Check if already in this tenant
      const existing = await this.prisma.tenantUser.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId } },
      })
      if (existing) throw new ConflictException('User already has access to this company')
    }

    await this.prisma.tenantUser.create({
      data: {
        userId: user.id,
        tenantId,
        roles: dto.roles,
      },
    })

    return {
      userId: user.id,
      email: user.email,
      isNewUser,
      tempPassword,
      message: isNewUser
        ? 'User created and added to company'
        : 'Existing user added to company',
    }
  }

  async updateUserRoles(tenantId: string, userId: string, dto: UpdateUserRolesDto) {
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!tenantUser) throw new NotFoundException('User not found in this company')
    if (tenantUser.isOwner) throw new ConflictException('Cannot modify owner roles')

    return this.prisma.tenantUser.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { roles: dto.roles },
    })
  }

  async removeUserFromTenant(tenantId: string, userId: string) {
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!tenantUser) throw new NotFoundException('User not found in this company')
    if (tenantUser.isOwner) throw new ConflictException('Cannot remove the company owner')

    await this.prisma.tenantUser.delete({
      where: { userId_tenantId: { userId, tenantId } },
    })
  }
}

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { v4 as uuidv4 } from 'uuid'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtPayload, TokenPair } from '@1biz/shared'

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name)
  private readonly refreshTokenExpiresInDays: number

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.refreshTokenExpiresInDays = config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 30)
  }

  async generateTokenPair(
    userId: string,
    payload: Omit<JwtPayload, 'sub'>,
    ipAddress?: string,
    userAgent?: string,
    rememberMe?: boolean,
  ): Promise<TokenPair> {
    const jwtPayload: JwtPayload = {
      sub: userId,
      ...payload,
    }

    const accessToken = this.jwtService.sign(jwtPayload)

    // Generate opaque refresh token
    // "Keep me signed in": 30 days, normal: 7 days
    const refreshToken = uuidv4()
    const expiresAt = new Date()
    const days = rememberMe ? this.refreshTokenExpiresInDays : 7
    expiresAt.setDate(expiresAt.getDate() + days)

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    return { accessToken, refreshToken }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            tenants: {
              include: { tenant: true },
              where: { tenant: { isActive: true } },
            },
          },
        },
      },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is inactive')
    }

    // Rotate: revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const tenantUser = stored.user.tenants[0]
    if (!tenantUser) {
      throw new UnauthorizedException('No active tenant found')
    }

    // Inject super_admin role if the user has the platform-level flag
    const roles = [...tenantUser.roles]
    if (stored.user.isSuperAdmin && !roles.includes('super_admin')) {
      roles.unshift('super_admin')
    }

    // Issue new token pair
    return this.generateTokenPair(stored.userId, {
      email: stored.user.email,
      tenantId: tenantUser.tenantId,
      tenantSchema: tenantUser.tenant.schema,
      roles,
    })
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}

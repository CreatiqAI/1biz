import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../prisma/prisma.service'
import { JwtPayload } from '@1biz/shared'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive')
    }

    // Attach full payload to request — available as req.user
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      tenantSchema: payload.tenantSchema,
      roles: payload.roles,
    }
  }
}

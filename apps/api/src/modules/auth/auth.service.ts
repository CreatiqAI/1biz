import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { TenantSchemaService } from '../../prisma/tenant-schema.service'
import { TokenService } from './token.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { AuthResponse, TokenPair } from '@1biz/shared'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly BCRYPT_ROUNDS = 12

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register a new company + admin user
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    })
    if (existingUser) {
      throw new ConflictException('An account with this email already exists')
    }

    // Check if company slug is taken
    const slug = this.generateSlug(dto.companyName)
    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug } })
    if (existingTenant) {
      throw new ConflictException('Company name already taken. Please choose a different name.')
    }

    // Generate unique schema name
    const schemaName = `tenant_${this.generateShortId()}`

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS)

    // Create tenant, user, settings in a transaction
    const { user, tenant } = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          schema: schemaName,
          plan: 'STARTER',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        },
      })

      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
        },
      })

      // Link user to tenant as owner + admin
      await tx.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          roles: ['admin'],
          isOwner: true,
        },
      })

      // Create default tenant settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          companyName: dto.companyName,
          currency: 'MYR',
          timezone: 'Asia/Kuala_Lumpur',
          dateFormat: 'DD/MM/YYYY',
          fiscalYearStart: 1,
        },
      })

      return { user, tenant }
    })

    // Create the tenant's PostgreSQL schema (outside transaction — DDL can't be in transactions)
    await this.tenantSchemaService.createTenantSchema(schemaName)

    this.logger.log(`New tenant registered: ${tenant.name} (${schemaName})`)

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(user.id, {
      email: user.email,
      tenantId: tenant.id,
      tenantSchema: schemaName,
      roles: ['admin'],
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: ['admin'],
        tenantId: tenant.id,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    }
  }

  /**
   * Login with email + password
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        tenants: {
          include: { tenant: true },
          where: { tenant: { isActive: true } },
        },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password')
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password')
    }

    if (user.tenants.length === 0) {
      throw new UnauthorizedException('No active company found for this account')
    }

    // For now, use the first (or only) tenant
    // Multi-tenant switching is handled separately
    const tenantUser = user.tenants[0]
    const tenant = tenantUser.tenant

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Inject super_admin role if the user has the platform-level flag
    const roles = [...tenantUser.roles]
    if (user.isSuperAdmin && !roles.includes('super_admin')) {
      roles.unshift('super_admin')
    }

    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      {
        email: user.email,
        tenantId: tenant.id,
        tenantSchema: tenant.schema,
        roles,
      },
      ipAddress,
      userAgent,
      dto.rememberMe,
    )

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl ?? undefined,
        roles,
        tenantId: tenant.id,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.refreshTokens(refreshToken)
  }

  /**
   * Logout — revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken)
  }

  /**
   * Validate user for passport local strategy
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (!user || !user.isActive) return null
    const isValid = await bcrypt.compare(password, user.passwordHash)
    return isValid ? user : null
  }

  private generateSlug(companyName: string): string {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)
  }

  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 10)
  }
}

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
import { AuthResponse, TokenPair, PLAN_MODULES } from '@1biz/shared'

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
        enabledModules: PLAN_MODULES['STARTER'] ?? [],
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
    const enabledModules = await this.resolveEnabledModules(tenant.id, tenant.plan, tenant.pricingModel)

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
        enabledModules,
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

  /**
   * Delete user account + company data (PDPA compliance).
   * Only the owner can delete the entire company.
   * Non-owners are removed from the tenant only.
   */
  async deleteAccount(
    userId: string,
    tenantId: string,
    password: string,
    confirmation: string,
  ): Promise<void> {
    if (confirmation !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException('Please type "DELETE MY ACCOUNT" to confirm.')
    }

    // Verify password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenants: { include: { tenant: true } } },
    })
    if (!user) throw new UnauthorizedException('User not found')

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password')

    // Check if user is the tenant owner
    const tenantUser = user.tenants.find((tu) => tu.tenantId === tenantId)
    if (!tenantUser) throw new BadRequestException('User is not in this tenant')

    if (tenantUser.isOwner) {
      // Owner: delete entire company + schema + all data
      const tenant = tenantUser.tenant

      this.logger.warn(`Account deletion: Owner ${user.email} deleting tenant ${tenant.name} (${tenant.schema})`)

      // 1. Drop the tenant schema (all business data)
      await this.tenantSchemaService.dropTenantSchema(tenant.schema)

      // 2. Delete all public-schema records in a transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.tenantSettings.deleteMany({ where: { tenantId } })
        await tx.subscription.deleteMany({ where: { tenantId } })
        // Remove all users from tenant
        const tenantUsers = await tx.tenantUser.findMany({ where: { tenantId } })
        await tx.tenantUser.deleteMany({ where: { tenantId } })
        // Remove refresh tokens for all tenant users
        for (const tu of tenantUsers) {
          await tx.refreshToken.deleteMany({ where: { userId: tu.userId } })
        }
        // Delete the tenant itself
        await tx.tenant.delete({ where: { id: tenantId } })
        // Delete the requesting user's platform account
        await tx.user.delete({ where: { id: userId } })
      })

      this.logger.warn(`Account deletion complete: ${user.email} / ${tenant.name}`)
    } else {
      // Non-owner: just remove from tenant + delete user if no other tenants
      this.logger.warn(`Account deletion: Non-owner ${user.email} leaving tenant ${tenantId}`)

      await this.prisma.tenantUser.delete({
        where: { userId_tenantId: { userId, tenantId } },
      })

      // Revoke all tokens
      await this.tokenService.revokeAllUserTokens(userId)

      // If user has no other tenants, delete their platform account
      const remaining = await this.prisma.tenantUser.count({ where: { userId } })
      if (remaining === 0) {
        await this.prisma.refreshToken.deleteMany({ where: { userId } })
        await this.prisma.user.delete({ where: { id: userId } })
      }
    }
  }

  /** Resolve which modules a tenant has access to */
  private async resolveEnabledModules(tenantId: string, plan: string, pricingModel: string): Promise<string[]> {
    if (pricingModel === 'MODULAR') {
      const mods = await this.prisma.tenantModule.findMany({
        where: { tenantId, isActive: true },
        select: { module: true },
      })
      return mods.map((m) => m.module)
    }
    return PLAN_MODULES[plan] ?? []
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

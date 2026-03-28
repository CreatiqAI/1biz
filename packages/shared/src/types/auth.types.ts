export interface JwtPayload {
  sub: string // user id
  email: string
  tenantId: string
  tenantSchema: string
  roles: string[]
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  companyName: string
  phone?: string
}

export interface AuthResponse {
  user: UserProfile
  tokens: TokenPair
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  companyName?: string
  avatarUrl?: string
  roles: string[]
  tenantId: string
  isActive: boolean
  isSuperAdmin?: boolean
  enabledModules: string[]
  createdAt: string
}

export enum AppModule {
  ACCOUNTING = 'ACCOUNTING',
  INVENTORY = 'INVENTORY',
  HR = 'HR',
  PAYROLL = 'PAYROLL',
  CRM = 'CRM',
  POS = 'POS',
}

/** Which modules each flat plan includes */
export const PLAN_MODULES: Record<string, AppModule[]> = {
  STARTER: [AppModule.ACCOUNTING, AppModule.INVENTORY],
  GROWTH: [AppModule.ACCOUNTING, AppModule.INVENTORY, AppModule.CRM, AppModule.HR],
  BUSINESS: [AppModule.ACCOUNTING, AppModule.INVENTORY, AppModule.CRM, AppModule.HR, AppModule.PAYROLL],
  ENTERPRISE: Object.values(AppModule),
}

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
  createdAt: string
}

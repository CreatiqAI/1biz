import { SetMetadata } from '@nestjs/common'
import { SystemRole } from '@1biz/shared'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles)

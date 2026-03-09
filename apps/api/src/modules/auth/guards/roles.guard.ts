import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { SystemRole, Permission, ROLE_PERMISSIONS } from '@1biz/shared'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No restrictions set
    if (!requiredRoles && !requiredPermissions) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new ForbiddenException('Access denied')

    const userRoles: SystemRole[] = user.roles ?? []

    // Super admin bypasses all checks
    if (userRoles.includes(SystemRole.SUPER_ADMIN)) return true

    // Check role requirement
    if (requiredRoles) {
      const hasRole = requiredRoles.some((r) => userRoles.includes(r))
      if (!hasRole) throw new ForbiddenException('Insufficient role')
    }

    // Check permission requirement
    if (requiredPermissions) {
      const userPermissions = userRoles.flatMap((role) => ROLE_PERMISSIONS[role] ?? [])
      const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p))
      if (!hasPermission) throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}

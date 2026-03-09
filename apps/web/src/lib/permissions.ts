import { SystemRole, Permission, ROLE_PERMISSIONS } from '@1biz/shared'

/**
 * Given a user's role strings, resolve all permissions they have.
 * super_admin and admin bypass — they get everything.
 */
export function resolvePermissions(roles: string[]): Set<Permission> {
  const perms = new Set<Permission>()
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role as SystemRole]
    if (rolePerms) {
      for (const p of rolePerms) perms.add(p)
    }
  }
  return perms
}

/**
 * Check if user roles grant a specific permission.
 * super_admin always returns true.
 */
export function hasPermission(roles: string[], permission: Permission): boolean {
  if (roles.includes('super_admin') || roles.includes('admin')) return true
  return resolvePermissions(roles).has(permission)
}

/**
 * Check if user roles grant ANY of the given permissions.
 */
export function hasAnyPermission(roles: string[], permissions: Permission[]): boolean {
  if (roles.includes('super_admin') || roles.includes('admin')) return true
  const userPerms = resolvePermissions(roles)
  return permissions.some((p) => userPerms.has(p))
}

/**
 * Route-to-permission mapping. Each route prefix maps to the permissions
 * needed to access it. Routes not listed are accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/accounting': [Permission.ACCOUNTING_VIEW],
  '/crm': [Permission.CRM_VIEW],
  '/inventory': [Permission.INVENTORY_VIEW],
  '/hr': [Permission.HR_VIEW],
  '/settings': [Permission.SETTINGS_VIEW],
  '/admin': [], // handled separately — super_admin only
}

/**
 * Check if a user can access a given pathname.
 */
export function canAccessRoute(roles: string[], pathname: string): boolean {
  // /admin is super_admin only
  if (pathname.startsWith('/admin')) {
    return roles.includes('super_admin')
  }

  // Dashboard is always accessible
  if (pathname === '/') return true

  // Find matching route prefix
  for (const [prefix, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(prefix) && perms.length > 0) {
      return hasAnyPermission(roles, perms)
    }
  }

  // No restriction found — allow
  return true
}

import { SetMetadata } from '@nestjs/common'

export const AUDIT_KEY = 'audit_entity'

export interface AuditMetadata {
  entity: string
  action?: string // override auto-detected action
}

/**
 * Mark a controller method for audit logging.
 * @param entity - the entity type, e.g. 'product', 'invoice'
 * @param action - optional override; defaults to HTTP-method-based detection
 */
export const Audit = (entity: string, action?: string) =>
  SetMetadata(AUDIT_KEY, { entity, action } as AuditMetadata)

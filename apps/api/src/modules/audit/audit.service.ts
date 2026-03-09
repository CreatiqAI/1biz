import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface AuditEntry {
  tenantSchema: string
  userId: string
  userEmail: string
  userName?: string
  action: string       // CREATE, UPDATE, DELETE, INVITE, TOGGLE, etc.
  entityType: string   // invoice, product, employee, user, etc.
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.$queryRawUnsafe(
        `INSERT INTO "${entry.tenantSchema}".audit_logs
           (user_id, user_email, user_name, action, entity_type, entity_id, details, ip_address)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        entry.userId,
        entry.userEmail,
        entry.userName ?? null,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ipAddress ?? null,
      )
    } catch (err) {
      // Never let audit logging break the main request
      this.logger.error(`Failed to write audit log: ${err}`)
    }
  }

  async findAll(
    tenantSchema: string,
    opts: { limit?: number; offset?: number; entityType?: string; userId?: string },
  ) {
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (opts.entityType) {
      conditions.push(`entity_type = $${paramIdx++}`)
      params.push(opts.entityType)
    }
    if (opts.userId) {
      conditions.push(`user_id = $${paramIdx++}::uuid`)
      params.push(opts.userId)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = opts.limit ?? 50
    const offset = opts.offset ?? 0

    const [rows, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<unknown[]>(
        `SELECT id, user_id, user_email, user_name, action, entity_type, entity_id, details, ip_address, created_at
         FROM "${tenantSchema}".audit_logs ${where}
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        ...params,
      ),
      this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".audit_logs ${where}`,
        ...params,
      ),
    ])

    return {
      rows,
      total: Number(countResult[0]?.count ?? 0),
      limit,
      offset,
    }
  }
}

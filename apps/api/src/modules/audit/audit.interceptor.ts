import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, tap } from 'rxjs'
import { AuditService } from './audit.service'
import { AUDIT_KEY, AuditMetadata } from './audit.decorator'

const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    )
    // No @Audit() decorator → skip
    if (!meta) return next.handle()

    const request = context.switchToHttp().getRequest()
    const method = request.method as string
    const action = meta.action || METHOD_ACTION_MAP[method]

    // Only audit mutating actions (skip GETs unless explicitly annotated)
    if (!action) return next.handle()

    const user = request.user
    if (!user) return next.handle()

    // Try to extract entity ID from route params or request body
    const entityId =
      request.params?.id ||
      request.params?.userId ||
      request.body?.id ||
      undefined

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          // Try to extract the created/updated entity ID from the response
          let resolvedEntityId = entityId
          if (!resolvedEntityId && responseBody?.data) {
            const data = responseBody.data
            resolvedEntityId = data.id || data.userId || undefined
          }

          // Fire and forget — don't await
          this.auditService.log({
            tenantSchema: user.tenantSchema,
            userId: user.userId,
            userEmail: user.email,
            action,
            entityType: meta.entity,
            entityId: resolvedEntityId ? String(resolvedEntityId) : undefined,
            details: this.buildDetails(method, request.body),
            ipAddress: request.ip || request.headers['x-real-ip'],
          })
        },
      }),
    )
  }

  private buildDetails(method: string, body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!body || method === 'DELETE') return undefined

    // Strip sensitive fields
    const { password, passwordHash, currentPassword, newPassword, ...safe } = body as Record<string, unknown>
    void password; void passwordHash; void currentPassword; void newPassword

    // Only include if there's meaningful data
    const keys = Object.keys(safe)
    return keys.length > 0 ? safe : undefined
  }
}

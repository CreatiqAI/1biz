import { BadRequestException } from '@nestjs/common'

const TENANT_SCHEMA_REGEX = /^tenant_[a-z0-9]+$/

/**
 * Validates that a tenant schema name is safe for SQL interpolation.
 * Schema names cannot be parameterized in PostgreSQL, so we must
 * validate the format strictly before using them in queries.
 */
export function validateSchemaName(schema: string): string {
  if (!TENANT_SCHEMA_REGEX.test(schema)) {
    throw new BadRequestException('Invalid tenant schema')
  }
  return schema
}

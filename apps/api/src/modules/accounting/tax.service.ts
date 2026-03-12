import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateTaxCodeDto {
  code: string
  name: string
  taxType: 'SERVICE' | 'SALES'
  rate: number
  effectiveFrom: string
  effectiveTo?: string
  categories?: string[]
  isDefault?: boolean
  isActive?: boolean
}

export interface UpdateTaxCodeDto {
  code?: string
  name?: string
  taxType?: 'SERVICE' | 'SALES'
  rate?: number
  effectiveFrom?: string
  effectiveTo?: string | null
  categories?: string[]
  isDefault?: boolean
  isActive?: boolean
}

export interface TaxCodeRow {
  id: string
  code: string
  name: string
  tax_type: string
  rate: number
  effective_from: Date
  effective_to: Date | null
  categories: string[] | null
  is_default: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
}

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string) {
    const rows = await this.prisma.$queryRawUnsafe<TaxCodeRow[]>(
      `SELECT id, code, name, tax_type, rate, effective_from, effective_to,
              categories, is_default, is_active, created_at, updated_at
       FROM "${tenantSchema}".tax_codes
       ORDER BY tax_type, rate`,
    )
    return rows
  }

  async findActive(tenantSchema: string, date?: string) {
    const asOfDate = date ?? new Date().toISOString().split('T')[0]
    const rows = await this.prisma.$queryRawUnsafe<TaxCodeRow[]>(
      `SELECT id, code, name, tax_type, rate, effective_from, effective_to,
              categories, is_default, is_active, created_at, updated_at
       FROM "${tenantSchema}".tax_codes
       WHERE is_active = TRUE
         AND effective_from <= $1::date
         AND (effective_to IS NULL OR effective_to >= $1::date)
       ORDER BY tax_type, rate`,
      asOfDate,
    )
    return rows
  }

  async create(tenantSchema: string, dto: CreateTaxCodeDto) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".tax_codes
         (code, name, tax_type, rate, effective_from, effective_to, categories, is_default, is_active)
       VALUES ($1, $2, $3, $4, $5::date, $6::date, $7::text[], $8, $9)
       RETURNING id`,
      dto.code,
      dto.name,
      dto.taxType,
      dto.rate,
      dto.effectiveFrom,
      dto.effectiveTo ?? null,
      dto.categories ?? null,
      dto.isDefault ?? false,
      dto.isActive ?? true,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, dto: UpdateTaxCodeDto) {
    // Build dynamic SET clause from provided fields
    const setClauses: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (dto.code !== undefined) {
      setClauses.push(`code = $${paramIndex}`)
      params.push(dto.code)
      paramIndex++
    }
    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`)
      params.push(dto.name)
      paramIndex++
    }
    if (dto.taxType !== undefined) {
      setClauses.push(`tax_type = $${paramIndex}`)
      params.push(dto.taxType)
      paramIndex++
    }
    if (dto.rate !== undefined) {
      setClauses.push(`rate = $${paramIndex}`)
      params.push(dto.rate)
      paramIndex++
    }
    if (dto.effectiveFrom !== undefined) {
      setClauses.push(`effective_from = $${paramIndex}::date`)
      params.push(dto.effectiveFrom)
      paramIndex++
    }
    if (dto.effectiveTo !== undefined) {
      setClauses.push(`effective_to = $${paramIndex}::date`)
      params.push(dto.effectiveTo)
      paramIndex++
    }
    if (dto.categories !== undefined) {
      setClauses.push(`categories = $${paramIndex}::text[]`)
      params.push(dto.categories)
      paramIndex++
    }
    if (dto.isDefault !== undefined) {
      setClauses.push(`is_default = $${paramIndex}`)
      params.push(dto.isDefault)
      paramIndex++
    }
    if (dto.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`)
      params.push(dto.isActive)
      paramIndex++
    }

    if (setClauses.length === 0) {
      throw new NotFoundException('No fields to update')
    }

    setClauses.push('updated_at = NOW()')

    const rows = await this.prisma.$queryRawUnsafe<TaxCodeRow[]>(
      `UPDATE "${tenantSchema}".tax_codes
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}::uuid
       RETURNING id, code, name, tax_type, rate, effective_from, effective_to,
                 categories, is_default, is_active, created_at, updated_at`,
      ...params,
      id,
    )

    if (!rows.length) throw new NotFoundException('Tax code not found')
    return rows[0]
  }

  async delete(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `DELETE FROM "${tenantSchema}".tax_codes WHERE id = $1::uuid RETURNING id`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Tax code not found')
    return { id: rows[0].id }
  }

  /**
   * Resolve the correct SST rate for a transaction.
   *
   * Logic:
   * 1. If a category is provided, look for a tax code that matches (has the category in its categories array).
   * 2. If no category match or no category provided, fall back to the default code for that taxType.
   * 3. Handle effective dates: only consider codes where effective_from <= date and (effective_to IS NULL or effective_to >= date).
   */
  async resolveRate(
    tenantSchema: string,
    taxType: string,
    category?: string,
    date?: string,
  ): Promise<{ code: string; name: string; rate: number; taxType: string }> {
    const asOfDate = date ?? new Date().toISOString().split('T')[0]

    // First try to find a category-specific rate
    if (category) {
      const categoryRows = await this.prisma.$queryRawUnsafe<TaxCodeRow[]>(
        `SELECT id, code, name, tax_type, rate, effective_from, effective_to,
                categories, is_default, is_active, created_at, updated_at
         FROM "${tenantSchema}".tax_codes
         WHERE is_active = TRUE
           AND tax_type = $1
           AND $2 = ANY(categories)
           AND effective_from <= $3::date
           AND (effective_to IS NULL OR effective_to >= $3::date)
         ORDER BY effective_from DESC
         LIMIT 1`,
        taxType,
        category,
        asOfDate,
      )
      if (categoryRows.length > 0) {
        const row = categoryRows[0]
        return { code: row.code, name: row.name, rate: Number(row.rate), taxType: row.tax_type }
      }
    }

    // Fall back to the default rate for this tax type
    const defaultRows = await this.prisma.$queryRawUnsafe<TaxCodeRow[]>(
      `SELECT id, code, name, tax_type, rate, effective_from, effective_to,
              categories, is_default, is_active, created_at, updated_at
       FROM "${tenantSchema}".tax_codes
       WHERE is_active = TRUE
         AND tax_type = $1
         AND is_default = TRUE
         AND effective_from <= $2::date
         AND (effective_to IS NULL OR effective_to >= $2::date)
       ORDER BY effective_from DESC
       LIMIT 1`,
      taxType,
      asOfDate,
    )

    if (defaultRows.length > 0) {
      const row = defaultRows[0]
      return { code: row.code, name: row.name, rate: Number(row.rate), taxType: row.tax_type }
    }

    // If no default found, try any active code for this tax type
    const anyRows = await this.prisma.$queryRawUnsafe<TaxCodeRow[]>(
      `SELECT id, code, name, tax_type, rate, effective_from, effective_to,
              categories, is_default, is_active, created_at, updated_at
       FROM "${tenantSchema}".tax_codes
       WHERE is_active = TRUE
         AND tax_type = $1
         AND effective_from <= $2::date
         AND (effective_to IS NULL OR effective_to >= $2::date)
       ORDER BY effective_from DESC
       LIMIT 1`,
      taxType,
      asOfDate,
    )

    if (anyRows.length > 0) {
      const row = anyRows[0]
      return { code: row.code, name: row.name, rate: Number(row.rate), taxType: row.tax_type }
    }

    // No rate found at all — return exempt / 0%
    return { code: 'SST_EXEMPT', name: 'Exempt', rate: 0, taxType }
  }

  /**
   * Seed the standard Malaysian SST tax codes into a tenant schema.
   * Uses ON CONFLICT to avoid duplicates (idempotent).
   */
  async seedDefaultCodes(tenantSchema: string) {
    const codes = [
      {
        code: 'SST_ST_8',
        name: 'Service Tax 8%',
        taxType: 'SERVICE',
        rate: 8.0,
        effectiveFrom: '2024-03-01',
        categories: null as string[] | null,
        isDefault: true,
      },
      {
        code: 'SST_ST_6_FB',
        name: 'Service Tax 6% (Food & Beverage)',
        taxType: 'SERVICE',
        rate: 6.0,
        effectiveFrom: '2024-03-01',
        categories: ['FOOD_BEVERAGE'],
        isDefault: false,
      },
      {
        code: 'SST_ST_6_TELECOM',
        name: 'Service Tax 6% (Telecommunication)',
        taxType: 'SERVICE',
        rate: 6.0,
        effectiveFrom: '2024-03-01',
        categories: ['TELECOMMUNICATION'],
        isDefault: false,
      },
      {
        code: 'SST_ST_6_PARKING',
        name: 'Service Tax 6% (Parking)',
        taxType: 'SERVICE',
        rate: 6.0,
        effectiveFrom: '2024-03-01',
        categories: ['PARKING'],
        isDefault: false,
      },
      {
        code: 'SST_ST_6_LOGISTICS',
        name: 'Service Tax 6% (Logistics)',
        taxType: 'SERVICE',
        rate: 6.0,
        effectiveFrom: '2024-03-01',
        categories: ['LOGISTICS'],
        isDefault: false,
      },
      {
        code: 'SST_SALES_10',
        name: 'Sales Tax 10%',
        taxType: 'SALES',
        rate: 10.0,
        effectiveFrom: '2018-09-01',
        categories: null as string[] | null,
        isDefault: true,
      },
      {
        code: 'SST_SALES_5',
        name: 'Sales Tax 5%',
        taxType: 'SALES',
        rate: 5.0,
        effectiveFrom: '2018-09-01',
        categories: null as string[] | null,
        isDefault: false,
      },
      {
        code: 'SST_EXEMPT',
        name: 'Exempt (0%)',
        taxType: 'SERVICE',
        rate: 0.0,
        effectiveFrom: '2018-09-01',
        categories: null as string[] | null,
        isDefault: false,
      },
    ]

    let seeded = 0
    for (const c of codes) {
      const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${tenantSchema}".tax_codes
           (code, name, tax_type, rate, effective_from, effective_to, categories, is_default, is_active)
         VALUES ($1, $2, $3, $4, $5::date, NULL, $6::text[], $7, TRUE)
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        c.code,
        c.name,
        c.taxType,
        c.rate,
        c.effectiveFrom,
        c.categories,
        c.isDefault,
      )
      if (result.length > 0) seeded++
    }

    return { seeded, total: codes.length }
  }
}

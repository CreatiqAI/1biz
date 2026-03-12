import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { DEFAULT_PUBLIC_HOLIDAYS_2026 } from '@1biz/shared'

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear()
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".public_holidays
       WHERE year = $1 AND is_active = TRUE
       ORDER BY date`,
      targetYear,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".public_holidays WHERE id = $1::uuid`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Public holiday not found')
    return rows[0]
  }

  async create(
    tenantSchema: string,
    data: { name: string; date: string; isMandatory?: boolean; state?: string },
  ) {
    const year = new Date(data.date).getFullYear()
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".public_holidays WHERE name = $1 AND date = $2::date AND year = $3`,
      data.name,
      data.date,
      year,
    )
    if (existing.length) throw new ConflictException('This public holiday already exists for the given date')

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".public_holidays (name, date, is_mandatory, state, year)
       VALUES ($1, $2::date, $3, $4, $5) RETURNING *`,
      data.name,
      data.date,
      data.isMandatory ?? false,
      data.state ?? null,
      year,
    )
    return rows[0]
  }

  async update(
    tenantSchema: string,
    id: string,
    data: { name?: string; date?: string; isMandatory?: boolean; state?: string },
  ) {
    await this.findOne(tenantSchema, id)
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${tenantSchema}".public_holidays SET
        name         = COALESCE($1, name),
        date         = COALESCE($2::date, date),
        is_mandatory = COALESCE($3, is_mandatory),
        state        = COALESCE($4, state)
       WHERE id = $5::uuid RETURNING *`,
      data.name ?? null,
      data.date ?? null,
      data.isMandatory ?? null,
      data.state ?? null,
      id,
    )
    return rows[0]
  }

  async remove(tenantSchema: string, id: string) {
    await this.findOne(tenantSchema, id)
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".public_holidays SET is_active = FALSE WHERE id = $1::uuid`,
      id,
    )
    return { deleted: true }
  }

  /**
   * Seed default public holidays for a year from the shared constants.
   * Generates dates for the given year based on the template.
   */
  async seedYear(tenantSchema: string, year: number) {
    let seeded = 0
    for (const h of DEFAULT_PUBLIC_HOLIDAYS_2026) {
      // Replace 2026 with target year in date
      const dateStr = h.date.replace('2026', String(year))
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".public_holidays (name, date, is_mandatory, year)
         VALUES ($1, $2::date, $3, $4)
         ON CONFLICT (name, date, year) DO NOTHING`,
        h.name,
        dateStr,
        h.mandatory,
        year,
      )
      seeded++
    }
    return { seeded, year }
  }

  /**
   * Check if a specific date is a public holiday for the tenant.
   */
  async isHoliday(tenantSchema: string, date: string, state?: string): Promise<boolean> {
    const stateFilter = state
      ? `AND (state IS NULL OR state = $2)`
      : `AND state IS NULL`
    const params: any[] = [date]
    if (state) params.push(state)

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${tenantSchema}".public_holidays
       WHERE date = $1::date AND is_active = TRUE ${stateFilter} LIMIT 1`,
      ...params,
    )
    return rows.length > 0
  }

  /**
   * Get holidays in a date range (used by payroll, leave, etc.)
   */
  async getHolidaysInRange(tenantSchema: string, startDate: string, endDate: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tenantSchema}".public_holidays
       WHERE date BETWEEN $1::date AND $2::date AND is_active = TRUE
       ORDER BY date`,
      startDate,
      endDate,
    )
  }
}

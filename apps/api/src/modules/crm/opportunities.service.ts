import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateOpportunityDto {
  name: string
  leadId?: string
  contactId?: string
  stage?: string
  probability?: number
  expectedValueSen?: number
  expectedCloseDate?: string
  notes?: string
}

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, stage?: string) {
    const stageFilter = stage ? `AND o.stage = '${stage}'` : ''
    return this.prisma.$queryRawUnsafe(
      `SELECT o.*, c.name AS contact_name, l.name AS lead_name
       FROM "${tenantSchema}".opportunities o
       LEFT JOIN "${tenantSchema}".contacts c ON c.id = o.contact_id
       LEFT JOIN "${tenantSchema}".leads l ON l.id = o.lead_id
       WHERE o.deleted_at IS NULL ${stageFilter}
       ORDER BY o.created_at DESC`,
    )
  }

  async create(tenantSchema: string, dto: CreateOpportunityDto, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "${tenantSchema}".opportunities
         (name, lead_id, contact_id, stage, probability,
          expected_value_sen, expected_close_date, notes, created_by)
       VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6,$7::date,$8,$9::uuid)
       RETURNING *`,
      dto.name, dto.leadId ?? null, dto.contactId ?? null,
      dto.stage ?? 'PROSPECTING', dto.probability ?? 50,
      dto.expectedValueSen ?? 0, dto.expectedCloseDate ?? null,
      dto.notes ?? null, userId,
    )
    return rows[0]
  }

  async update(tenantSchema: string, id: string, dto: Partial<CreateOpportunityDto> & { stage?: string }) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${tenantSchema}".opportunities SET
         name = COALESCE($1, name),
         stage = COALESCE($2, stage),
         probability = COALESCE($3, probability),
         expected_value_sen = COALESCE($4, expected_value_sen),
         expected_close_date = COALESCE($5::date, expected_close_date),
         notes = COALESCE($6, notes),
         updated_at = NOW()
       WHERE id = $7::uuid AND deleted_at IS NULL
       RETURNING *`,
      dto.name ?? null, dto.stage ?? null, dto.probability ?? null,
      dto.expectedValueSen ?? null, dto.expectedCloseDate ?? null,
      dto.notes ?? null, id,
    )
    if (!rows.length) throw new NotFoundException('Opportunity not found')
    return rows[0]
  }
}

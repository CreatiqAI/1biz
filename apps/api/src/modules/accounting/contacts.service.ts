import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateContactDto {
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH'
  name: string
  companyName?: string
  email?: string
  phone?: string
  regNo?: string
  taxId?: string
  addressLine1?: string
  city?: string
  state?: string
  postcode?: string
  paymentTerms?: number
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantSchema: string, type?: string) {
    const typeFilter = type ? `AND type = '${type}'` : ''
    return this.prisma.$queryRawUnsafe(
      `SELECT id, type, name, company_name, email, phone, reg_no, tax_id,
              city, state, payment_terms, is_active
       FROM "${tenantSchema}".contacts
       WHERE deleted_at IS NULL ${typeFilter}
       ORDER BY name`,
    )
  }

  async findOne(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT * FROM "${tenantSchema}".contacts WHERE id = $1::uuid AND deleted_at IS NULL`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Contact not found')
    return rows[0]
  }

  async remove(tenantSchema: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `UPDATE "${tenantSchema}".contacts SET deleted_at = NOW() WHERE id = $1::uuid AND deleted_at IS NULL RETURNING id`,
      id,
    )
    if (!rows.length) throw new NotFoundException('Contact not found')
    return rows[0]
  }

  async create(tenantSchema: string, dto: CreateContactDto, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${tenantSchema}".contacts
         (type, name, company_name, email, phone, reg_no, tax_id,
          address_line1, city, state, postcode, payment_terms, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::uuid)
       RETURNING id`,
      dto.type, dto.name, dto.companyName ?? null, dto.email ?? null,
      dto.phone ?? null, dto.regNo ?? null, dto.taxId ?? null,
      dto.addressLine1 ?? null, dto.city ?? null, dto.state ?? null,
      dto.postcode ?? null, dto.paymentTerms ?? 30, userId,
    )
    return rows[0]
  }
}

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { createHash } from 'crypto'
import {
  EINVOICE_TYPE_CODES,
  TAX_TYPE_CODES,
  MY_STATE_CODES,
  GENERAL_TIN,
  type MyInvoisTokenResponse,
  type SubmitDocumentResponse,
  type DocumentStatusResponse,
  type MyInvoisSettings,
  type UBLInvoice,
  type UBLInvoiceBody,
  type UBLParty,
  type UBLTaxTotal,
  type UBLInvoiceLine,
} from './myinvois.types'
import { MYINVOIS } from '@1biz/shared'

interface InvoiceRow {
  id: string
  invoice_no: string
  type: string
  issue_date: string
  due_date: string | null
  currency: string
  subtotal_sen: string
  sst_amount_sen: string
  discount_sen: string
  total_sen: string
  sst_type: string | null
  sst_rate: string | null
  myinvois_uuid: string | null
  myinvois_status: string | null
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  contact_tax_id: string | null
  contact_reg_no: string | null
  contact_ic_no: string | null
  contact_address_line1: string | null
  contact_address_line2: string | null
  contact_city: string | null
  contact_state: string | null
  contact_postcode: string | null
  contact_country: string | null
  original_invoice_no?: string | null
  original_invoice_uuid?: string | null
}

interface InvoiceLineRow {
  id: string
  description: string
  quantity: string
  unit_price_sen: string
  subtotal_sen: string
  sst_rate: string
  sst_amount_sen: string
  total_sen: string
  sort_order: number
}

@Injectable()
export class MyInvoisService {
  private readonly logger = new Logger(MyInvoisService.name)

  // Token cache per tenant
  private tokenCache = new Map<string, { token: string; expiresAt: number }>()

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get MyInvois Settings ──────────────────────────────────────────────────

  async getSettings(tenantId: string): Promise<MyInvoisSettings> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    })
    if (!settings) throw new NotFoundException('Tenant settings not found')
    if (!settings.myinvoisEnabled) throw new BadRequestException('MyInvois is not enabled for this tenant')
    if (!settings.myinvoisClientId || !settings.myinvoisClientSecret) {
      throw new BadRequestException('MyInvois credentials not configured. Go to Settings > E-Invoice.')
    }
    if (!settings.myinvoisTin) {
      throw new BadRequestException('Company TIN not configured for MyInvois.')
    }

    return {
      clientId: settings.myinvoisClientId,
      clientSecret: settings.myinvoisClientSecret,
      tin: settings.myinvoisTin,
      brn: settings.myinvoisBrn || settings.companyRegNo || '',
      msicCode: settings.myinvoisMsicCode || '62010',
      businessDesc: settings.myinvoisBusinessDesc || 'Information technology consultancy activities',
      environment: (settings.myinvoisEnvironment as 'SANDBOX' | 'PRODUCTION') || 'SANDBOX',
      enabled: settings.myinvoisEnabled,
      companyName: settings.companyName,
      email: settings.email || '',
      phone: (settings.phone || '').replace(/[^0-9+]/g, ''),
      addressLine1: settings.addressLine1 || '',
      addressLine2: settings.addressLine2 || undefined,
      city: settings.city || '',
      state: settings.state || '',
      postcode: settings.postcode || '',
      country: settings.country || 'MY',
      sstRegNo: settings.taxRegNo || undefined,
    }
  }

  // ─── OAuth2 Token Management ─────────────────────────────────────────────────

  private getBaseUrl(environment: 'SANDBOX' | 'PRODUCTION'): string {
    return environment === 'PRODUCTION' ? MYINVOIS.PRODUCTION_URL : MYINVOIS.SANDBOX_URL
  }

  async getAccessToken(settings: MyInvoisSettings): Promise<string> {
    const cacheKey = `${settings.clientId}_${settings.environment}`
    const cached = this.tokenCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.token
    }

    const baseUrl = this.getBaseUrl(settings.environment)
    const response = await fetch(`${baseUrl}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        grant_type: 'client_credentials',
        scope: 'InvoicingAPI',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      this.logger.error(`MyInvois auth failed: ${response.status} ${error}`)
      throw new BadRequestException(`MyInvois authentication failed: ${response.status}`)
    }

    const data: MyInvoisTokenResponse = await response.json()

    // Cache token with 55 min TTL (actual: 60 min)
    this.tokenCache.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    })

    return data.access_token
  }

  // ─── Submit Invoice to LHDN ──────────────────────────────────────────────────

  async submitInvoice(
    tenantSchema: string,
    tenantId: string,
    invoiceId: string,
    userId: string,
  ): Promise<{
    submissionUID: string
    uuid: string
    status: string
  }> {
    const settings = await this.getSettings(tenantId)

    // Fetch invoice with contact + lines
    const invoiceRows = await this.prisma.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT i.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone,
              c.tax_id as contact_tax_id, c.reg_no as contact_reg_no, c.ic_no as contact_ic_no,
              c.address_line1 as contact_address_line1, c.address_line2 as contact_address_line2,
              c.city as contact_city, c.state as contact_state, c.postcode as contact_postcode,
              c.country as contact_country
       FROM "${tenantSchema}".invoices i
       JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
       WHERE i.id = $1::uuid AND i.deleted_at IS NULL`,
      invoiceId,
    )

    if (!invoiceRows.length) throw new NotFoundException('Invoice not found')
    const invoice = invoiceRows[0]

    if (invoice.myinvois_status === 'VALID') {
      throw new BadRequestException('Invoice already validated by LHDN')
    }
    if (invoice.myinvois_status === 'PENDING') {
      throw new BadRequestException('Invoice submission is already in progress')
    }

    // Fetch invoice lines
    const lines = await this.prisma.$queryRawUnsafe<InvoiceLineRow[]>(
      `SELECT * FROM "${tenantSchema}".invoice_lines
       WHERE invoice_id = $1::uuid ORDER BY sort_order`,
      invoiceId,
    )

    if (!lines.length) throw new BadRequestException('Invoice has no line items')

    // If credit/debit note, fetch original invoice UUID
    if (invoice.type === 'CREDIT_NOTE' || invoice.type === 'DEBIT_NOTE') {
      const origRows = await this.prisma.$queryRawUnsafe<{ invoice_no: string; myinvois_uuid: string }[]>(
        `SELECT invoice_no, myinvois_uuid FROM "${tenantSchema}".invoices
         WHERE id = (SELECT source_id FROM "${tenantSchema}".invoices WHERE id = $1::uuid)`,
        invoiceId,
      )
      if (origRows.length) {
        invoice.original_invoice_no = origRows[0].invoice_no
        invoice.original_invoice_uuid = origRows[0].myinvois_uuid
      }
    }

    // Build UBL document
    const ublDocument = this.buildUBLDocument(invoice, lines, settings)
    const jsonStr = JSON.stringify(ublDocument)
    const base64Doc = Buffer.from(jsonStr).toString('base64')
    const docHash = createHash('sha256').update(jsonStr).digest('hex')

    // Submit to LHDN
    const token = await this.getAccessToken(settings)
    const baseUrl = this.getBaseUrl(settings.environment)

    const submitResponse = await fetch(`${baseUrl}/api/v1.0/documentsubmissions/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: [
          {
            format: 'JSON',
            document: base64Doc,
            documentHash: docHash,
            codeNumber: invoice.invoice_no,
          },
        ],
      }),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      this.logger.error(`MyInvois submit failed: ${submitResponse.status} ${errorText}`)

      // Update invoice with error
      await this.prisma.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".invoices
         SET myinvois_status = 'INVALID',
             myinvois_errors = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        invoiceId,
        JSON.stringify({ httpStatus: submitResponse.status, error: errorText }),
      )

      throw new BadRequestException(`LHDN submission failed: ${submitResponse.status}`)
    }

    const result: SubmitDocumentResponse = await submitResponse.json()

    // Check if document was accepted or rejected
    if (result.rejectedDocuments?.length) {
      const rejection = result.rejectedDocuments[0]
      await this.prisma.$queryRawUnsafe(
        `UPDATE "${tenantSchema}".invoices
         SET myinvois_status = 'INVALID',
             myinvois_errors = $2::jsonb,
             myinvois_submitted_at = NOW(),
             updated_at = NOW()
         WHERE id = $1::uuid`,
        invoiceId,
        JSON.stringify(rejection.error),
      )
      throw new BadRequestException(`LHDN rejected: ${rejection.error.message}`)
    }

    const accepted = result.acceptedDocuments[0]

    // Update invoice with submission details
    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".invoices
       SET myinvois_uuid = $2,
           myinvois_submission_uid = $3,
           myinvois_status = 'PENDING',
           myinvois_submitted_at = NOW(),
           myinvois_errors = NULL,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      invoiceId,
      accepted.uuid,
      result.submissionUID,
    )

    // Start async polling for validation result
    this.pollValidationStatus(tenantSchema, invoiceId, result.submissionUID, settings).catch(
      (err) => this.logger.error(`Polling failed for ${invoiceId}: ${err.message}`),
    )

    return {
      submissionUID: result.submissionUID,
      uuid: accepted.uuid,
      status: 'PENDING',
    }
  }

  // ─── Poll Validation Status ──────────────────────────────────────────────────

  private async pollValidationStatus(
    tenantSchema: string,
    invoiceId: string,
    submissionUID: string,
    settings: MyInvoisSettings,
    maxRetries = 10,
  ): Promise<void> {
    const token = await this.getAccessToken(settings)
    const baseUrl = this.getBaseUrl(settings.environment)

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 5000)) // Wait 5 seconds between polls

      const response = await fetch(
        `${baseUrl}/api/v1.0/documentsubmissions/${submissionUID}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!response.ok) {
        this.logger.warn(`Poll failed for ${submissionUID}: ${response.status}`)
        continue
      }

      const data: DocumentStatusResponse = await response.json()

      if (data.overallStatus === 'InProgress') continue

      // Find our document
      const doc = data.documentSummary?.find(
        (d) => d.submissionUID === submissionUID,
      ) || data.documentSummary?.[0]

      if (!doc) continue

      if (doc.status === 'Valid') {
        await this.prisma.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".invoices
           SET myinvois_status = 'VALID',
               myinvois_long_id = $2,
               myinvois_validated_at = $3::timestamptz,
               myinvois_errors = NULL,
               updated_at = NOW()
           WHERE id = $1::uuid`,
          invoiceId,
          doc.longId,
          doc.dateTimeValidated,
        )
        this.logger.log(`Invoice ${invoiceId} validated by LHDN: ${doc.uuid}`)
      } else {
        await this.prisma.$queryRawUnsafe(
          `UPDATE "${tenantSchema}".invoices
           SET myinvois_status = 'INVALID',
               myinvois_errors = $2::jsonb,
               updated_at = NOW()
           WHERE id = $1::uuid`,
          invoiceId,
          JSON.stringify({ status: doc.status, reason: doc.documentStatusReason }),
        )
        this.logger.warn(`Invoice ${invoiceId} rejected by LHDN: ${doc.documentStatusReason}`)
      }
      return
    }

    this.logger.warn(`Polling timed out for invoice ${invoiceId}`)
  }

  // ─── Cancel E-Invoice ────────────────────────────────────────────────────────

  async cancelEInvoice(
    tenantSchema: string,
    tenantId: string,
    invoiceId: string,
    reason: string,
  ): Promise<void> {
    const settings = await this.getSettings(tenantId)

    const rows = await this.prisma.$queryRawUnsafe<{ myinvois_uuid: string; myinvois_status: string }[]>(
      `SELECT myinvois_uuid, myinvois_status FROM "${tenantSchema}".invoices
       WHERE id = $1::uuid AND deleted_at IS NULL`,
      invoiceId,
    )
    if (!rows.length) throw new NotFoundException('Invoice not found')
    if (!rows[0].myinvois_uuid) throw new BadRequestException('Invoice has not been submitted to LHDN')
    if (rows[0].myinvois_status !== 'VALID') throw new BadRequestException('Only VALID invoices can be cancelled')

    const token = await this.getAccessToken(settings)
    const baseUrl = this.getBaseUrl(settings.environment)

    const response = await fetch(
      `${baseUrl}/api/v1.0/documents/state/${rows[0].myinvois_uuid}/state`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled', reason }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new BadRequestException(`LHDN cancellation failed: ${error}`)
    }

    await this.prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".invoices
       SET myinvois_status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1::uuid`,
      invoiceId,
    )
  }

  // ─── Get E-Invoice Status ───────────────────────────────────────────────────

  async getEInvoiceStatus(tenantSchema: string, invoiceId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{
      myinvois_uuid: string | null
      myinvois_long_id: string | null
      myinvois_submission_uid: string | null
      myinvois_status: string
      myinvois_validated_at: string | null
      myinvois_errors: any
      myinvois_submitted_at: string | null
    }[]>(
      `SELECT myinvois_uuid, myinvois_long_id, myinvois_submission_uid,
              myinvois_status, myinvois_validated_at, myinvois_errors,
              myinvois_submitted_at
       FROM "${tenantSchema}".invoices WHERE id = $1::uuid AND deleted_at IS NULL`,
      invoiceId,
    )
    if (!rows.length) throw new NotFoundException('Invoice not found')
    const r = rows[0]
    return {
      uuid: r.myinvois_uuid,
      longId: r.myinvois_long_id,
      submissionUID: r.myinvois_submission_uid,
      status: r.myinvois_status || 'NOT_SUBMITTED',
      validatedAt: r.myinvois_validated_at,
      errors: r.myinvois_errors,
      submittedAt: r.myinvois_submitted_at,
      validationUrl: r.myinvois_uuid && r.myinvois_long_id
        ? `https://myinvois.hasil.gov.my/${r.myinvois_uuid}/share/${r.myinvois_long_id}`
        : null,
    }
  }

  // ─── Validate Taxpayer TIN ──────────────────────────────────────────────────

  async validateTIN(
    tenantId: string,
    tin: string,
    idType: 'BRN' | 'NRIC' | 'PASSPORT' | 'ARMY',
    idValue: string,
  ): Promise<boolean> {
    const settings = await this.getSettings(tenantId)
    const token = await this.getAccessToken(settings)
    const baseUrl = this.getBaseUrl(settings.environment)

    const response = await fetch(
      `${baseUrl}/api/v1.0/taxpayer/validate/${encodeURIComponent(tin)}?idType=${idType}&idValue=${encodeURIComponent(idValue)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    return response.ok
  }

  // ─── Build UBL 2.1 Document ──────────────────────────────────────────────────

  private buildUBLDocument(
    invoice: InvoiceRow,
    lines: InvoiceLineRow[],
    settings: MyInvoisSettings,
  ): UBLInvoice {
    const currency = invoice.currency || 'MYR'
    const issueDate = new Date(invoice.issue_date)
    const issueDateStr = issueDate.toISOString().split('T')[0]
    const issueTimeStr = issueDate.toISOString().split('T')[1]?.replace(/\.\d+/, '') || '00:00:00Z'

    // Determine document type code
    let typeCode: string = EINVOICE_TYPE_CODES.INVOICE
    if (invoice.type === 'CREDIT_NOTE') typeCode = EINVOICE_TYPE_CODES.CREDIT_NOTE
    if (invoice.type === 'DEBIT_NOTE') typeCode = EINVOICE_TYPE_CODES.DEBIT_NOTE

    // Determine tax type code
    let taxTypeCode: string = TAX_TYPE_CODES.SST_02 // Service tax default
    if (invoice.sst_type === 'SALES') taxTypeCode = TAX_TYPE_CODES.SST_01
    if (invoice.sst_type === 'EXEMPT' || !invoice.sst_type) taxTypeCode = TAX_TYPE_CODES.TAX_EXEMPTION

    // Build supplier party
    const supplierParty = this.buildParty({
      name: settings.companyName,
      tin: settings.tin,
      brn: settings.brn,
      sstRegNo: settings.sstRegNo,
      msicCode: settings.msicCode,
      businessDesc: settings.businessDesc,
      email: settings.email,
      phone: settings.phone,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2,
      city: settings.city,
      state: settings.state,
      postcode: settings.postcode,
      country: settings.country,
    })

    // Determine buyer TIN
    let buyerTin = invoice.contact_tax_id || ''
    if (!buyerTin) {
      if (invoice.contact_ic_no) {
        buyerTin = GENERAL_TIN.MALAYSIAN_INDIVIDUAL
      } else {
        buyerTin = GENERAL_TIN.MALAYSIAN_INDIVIDUAL
      }
    }

    // Build buyer party
    const buyerParty = this.buildParty({
      name: invoice.contact_name,
      tin: buyerTin,
      brn: invoice.contact_reg_no || invoice.contact_ic_no || 'NA',
      email: invoice.contact_email || ';',
      phone: (invoice.contact_phone || '').replace(/[^0-9+]/g, '') || 'NA',
      addressLine1: invoice.contact_address_line1 || 'NA',
      addressLine2: invoice.contact_address_line2 || undefined,
      city: invoice.contact_city || 'NA',
      state: invoice.contact_state || '',
      postcode: invoice.contact_postcode || '',
      country: invoice.contact_country || 'MY',
    })

    // Build line items
    const subtotalSen = BigInt(invoice.subtotal_sen)
    const taxSen = BigInt(invoice.sst_amount_sen)
    const totalSen = BigInt(invoice.total_sen)
    const discountSen = BigInt(invoice.discount_sen)

    const invoiceLines: UBLInvoiceLine[] = lines.map((line, idx) => {
      const qty = Number(line.quantity)
      const unitPrice = Number(line.unit_price_sen) / 100
      const lineSubtotal = Number(line.subtotal_sen) / 100
      const lineTax = Number(line.sst_amount_sen) / 100
      const lineTotal = Number(line.total_sen) / 100
      const lineRate = Number(line.sst_rate) || 0

      return {
        ID: [{ _: String(idx + 1) }],
        InvoicedQuantity: [{ _: qty, unitCode: 'C62' }],
        LineExtensionAmount: [{ _: lineSubtotal, currencyID: currency }],
        TaxTotal: [{
          TaxAmount: [{ _: lineTax, currencyID: currency }],
          TaxSubtotal: [{
            TaxableAmount: [{ _: lineSubtotal, currencyID: currency }],
            TaxAmount: [{ _: lineTax, currencyID: currency }],
            TaxCategory: [{
              ID: [{ _: lineRate > 0 ? taxTypeCode : TAX_TYPE_CODES.TAX_EXEMPTION }],
              TaxScheme: [{
                ID: [{ _: 'OTH', schemeID: 'UN/ECE 5153', schemeAgencyID: '6' }],
              }],
            }],
          }],
        }],
        Item: [{
          Description: [{ _: line.description }],
          CommodityClassification: [{
            ItemClassificationCode: [{ _: '001', listID: 'CLASS' }],
          }],
        }],
        Price: [{
          PriceAmount: [{ _: unitPrice, currencyID: currency }],
        }],
        ItemPriceExtension: [{
          Amount: [{ _: lineSubtotal, currencyID: currency }],
        }],
      }
    })

    const body: UBLInvoiceBody = {
      ID: [{ _: invoice.invoice_no }],
      IssueDate: [{ _: issueDateStr }],
      IssueTime: [{ _: issueTimeStr }],
      InvoiceTypeCode: [{ _: typeCode, listVersionID: MYINVOIS.DOCUMENT_VERSION }],
      DocumentCurrencyCode: [{ _: currency }],
      AccountingSupplierParty: [supplierParty],
      AccountingCustomerParty: [buyerParty],
      TaxTotal: [{
        TaxAmount: [{ _: Number(taxSen) / 100, currencyID: currency }],
        TaxSubtotal: [{
          TaxableAmount: [{ _: Number(subtotalSen) / 100, currencyID: currency }],
          TaxAmount: [{ _: Number(taxSen) / 100, currencyID: currency }],
          TaxCategory: [{
            ID: [{ _: taxTypeCode }],
            TaxScheme: [{
              ID: [{ _: 'OTH', schemeID: 'UN/ECE 5153', schemeAgencyID: '6' }],
            }],
          }],
        }],
      }],
      LegalMonetaryTotal: [{
        LineExtensionAmount: [{ _: Number(subtotalSen) / 100, currencyID: currency }],
        TaxExclusiveAmount: [{ _: Number(subtotalSen) / 100, currencyID: currency }],
        TaxInclusiveAmount: [{ _: Number(totalSen) / 100, currencyID: currency }],
        PayableAmount: [{ _: Number(totalSen) / 100, currencyID: currency }],
      }],
      InvoiceLine: invoiceLines,
    }

    // Add billing reference for credit/debit notes
    if (invoice.type === 'CREDIT_NOTE' || invoice.type === 'DEBIT_NOTE') {
      if (invoice.original_invoice_no) {
        body.BillingReference = [{
          InvoiceDocumentReference: [{
            ID: [{ _: invoice.original_invoice_no }],
          }],
        }]
      }
    }

    // Add exchange rate if not MYR
    if (currency !== 'MYR') {
      body.TaxExchangeRate = [{
        SourceCurrencyCode: [{ _: currency }],
        TargetCurrencyCode: [{ _: 'MYR' }],
        CalculationRate: [{ _: 1 }], // TODO: Use actual exchange rate from invoice
      }]
    }

    return {
      _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      Invoice: [body],
    }
  }

  private buildParty(p: {
    name: string
    tin: string
    brn: string
    sstRegNo?: string
    msicCode?: string
    businessDesc?: string
    email: string
    phone: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postcode: string
    country: string
  }): UBLParty {
    const identifications: { ID: { _: string; schemeID: string }[] }[] = [
      { ID: [{ _: p.tin, schemeID: 'TIN' }] },
      { ID: [{ _: p.brn || 'NA', schemeID: 'BRN' }] },
    ]

    if (p.sstRegNo) {
      identifications.push({ ID: [{ _: p.sstRegNo, schemeID: 'SST' }] })
    }

    const addressLines = [{ Line: [{ _: p.addressLine1 }] }]
    if (p.addressLine2) {
      addressLines.push({ Line: [{ _: p.addressLine2 }] })
    }

    const stateCode = MY_STATE_CODES[p.state] || '14' // Default to KL

    const party: UBLParty = {
      Party: [{
        PartyIdentification: identifications,
        PostalAddress: [{
          AddressLine: addressLines,
          CityName: [{ _: p.city || 'NA' }],
          PostalZone: p.postcode ? [{ _: p.postcode }] : undefined,
          CountrySubentityCode: [{ _: stateCode }],
          Country: [{
            IdentificationCode: [{ _: p.country || 'MYS', listID: 'ISO3166-1', listAgencyID: '6' }],
          }],
        }],
        PartyLegalEntity: [{
          RegistrationName: [{ _: p.name }],
        }],
        Contact: [{
          Telephone: [{ _: p.phone || 'NA' }],
          ElectronicMail: [{ _: p.email || ';' }],
        }],
      }],
    }

    // Add MSIC code for supplier
    if (p.msicCode) {
      party.Party[0].IndustryClassificationCode = [{
        _: p.msicCode,
        name: p.businessDesc || '',
      }]
    }

    return party
  }
}

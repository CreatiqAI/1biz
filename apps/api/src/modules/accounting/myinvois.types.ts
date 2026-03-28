// ─── MyInvois (LHDN) E-Invoice Types ─────────────────────────────────────────
// Based on UBL 2.1 standard, MyInvois SDK v1.0
// Reference: https://sdk.myinvois.hasil.gov.my/

// ─── Document Type Codes ─────────────────────────────────────────────────────
export const EINVOICE_TYPE_CODES = {
  INVOICE: '01',
  CREDIT_NOTE: '02',
  DEBIT_NOTE: '03',
  REFUND_NOTE: '04',
  SELF_BILLED_INVOICE: '11',
  SELF_BILLED_CREDIT_NOTE: '12',
  SELF_BILLED_DEBIT_NOTE: '13',
  SELF_BILLED_REFUND_NOTE: '14',
} as const

// ─── Tax Type Codes ──────────────────────────────────────────────────────────
export const TAX_TYPE_CODES = {
  SST_01: '01', // Sales Tax
  SST_02: '02', // Service Tax
  TOURISM_TAX: '03',
  HIGH_VALUE_GOODS_TAX: '04',
  SALES_TAX_ON_LOW_VALUE_GOODS: '05',
  NOT_APPLICABLE: '06',
  TAX_EXEMPTION: 'E',
} as const

// ─── Payment Mode Codes ──────────────────────────────────────────────────────
export const PAYMENT_MODE_CODES = {
  CASH: '01',
  CHEQUE: '02',
  BANK_TRANSFER: '03',
  CREDIT_CARD: '04',
  DEBIT_CARD: '05',
  E_WALLET: '06',
  DIGITAL_BANK: '07',
  OTHERS: '08',
} as const

// ─── Malaysian State Codes (ISO 3166-2:MY) ──────────────────────────────────
export const MY_STATE_CODES: Record<string, string> = {
  Johor: '01',
  Kedah: '02',
  Kelantan: '03',
  Melaka: '04',
  'Negeri Sembilan': '05',
  Pahang: '06',
  'Pulau Pinang': '07',
  Perak: '08',
  Perlis: '09',
  Selangor: '10',
  Terengganu: '11',
  Sabah: '12',
  Sarawak: '13',
  'Kuala Lumpur': '14',
  Labuan: '15',
  Putrajaya: '16',
}

// ─── General TIN Codes (for buyers without TIN) ─────────────────────────────
export const GENERAL_TIN = {
  MALAYSIAN_INDIVIDUAL: 'EI00000000010',
  NON_MALAYSIAN_INDIVIDUAL: 'EI00000000020',
  FOREIGN_SUPPLIER: 'EI00000000030',
  GOVERNMENT_ENTITY: 'EI00000000040',
} as const

// ─── API Response Types ──────────────────────────────────────────────────────

export interface MyInvoisTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface SubmitDocumentRequest {
  documents: {
    format: 'JSON' | 'XML'
    document: string // Base64-encoded UBL document
    documentHash: string // SHA256 hash
    codeNumber: string // Internal invoice number
  }[]
}

export interface SubmitDocumentResponse {
  submissionUID: string
  acceptedDocuments: {
    uuid: string
    invoiceCodeNumber: string
  }[]
  rejectedDocuments: {
    invoiceCodeNumber: string
    error: {
      code: string
      message: string
      target?: string
      details?: { code: string; message: string; target?: string }[]
    }
  }[]
}

export interface DocumentStatusResponse {
  submissionUID: string
  documentCount: number
  dateTimeReceived: string
  overallStatus: 'InProgress' | 'Valid' | 'PartiallyValid' | 'Invalid'
  documentSummary: {
    uuid: string
    submissionUID: string
    longId: string
    internalId: string
    typeName: string
    typeVersionName: string
    issuerTin: string
    receiverTin: string
    dateTimeIssued: string
    dateTimeReceived: string
    dateTimeValidated: string
    totalExcludingTax: number
    totalDiscount: number
    totalNetAmount: number
    totalPayableAmount: number
    status: 'Valid' | 'Invalid' | 'Cancelled'
    cancelDateTime?: string
    rejectRequestDateTime?: string
    documentStatusReason?: string
    createdByUserId?: string
  }[]
}

export interface DocumentDetailsResponse {
  uuid: string
  submissionUID: string
  longId: string
  internalId: string
  typeName: string
  typeVersionName: string
  issuerTin: string
  issuerName: string
  receiverId: string
  receiverName: string
  dateTimeIssued: string
  dateTimeReceived: string
  dateTimeValidated: string
  totalExcludingTax: number
  totalDiscount: number
  totalNetAmount: number
  totalPayableAmount: number
  status: 'Valid' | 'Invalid' | 'Cancelled'
  validationResults?: {
    status: string
    validatedSteps: {
      status: string
      name: string
    }[]
  }
}

export interface CancelDocumentRequest {
  status: 'cancelled'
  reason: string
}

// ─── UBL 2.1 Document Structure (JSON format for v1.0) ──────────────────────

export interface UBLInvoice {
  _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'
  _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
  _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
  Invoice: UBLInvoiceBody[]
}

export interface UBLInvoiceBody {
  ID: { _: string }[]
  IssueDate: { _: string }[]
  IssueTime: { _: string }[]
  InvoiceTypeCode: { _: string; listVersionID: string }[]
  DocumentCurrencyCode: { _: string }[]
  TaxExchangeRate?: {
    SourceCurrencyCode: { _: string }[]
    TargetCurrencyCode: { _: string }[]
    CalculationRate: { _: number }[]
  }[]
  InvoicePeriod?: {
    StartDate: { _: string }[]
    EndDate: { _: string }[]
    Description: { _: string }[]
  }[]
  BillingReference?: {
    InvoiceDocumentReference: {
      ID: { _: string }[]
    }[]
  }[]
  AccountingSupplierParty: UBLParty[]
  AccountingCustomerParty: UBLParty[]
  TaxTotal: UBLTaxTotal[]
  LegalMonetaryTotal: UBLLegalMonetaryTotal[]
  InvoiceLine: UBLInvoiceLine[]
}

export interface UBLParty {
  Party: {
    IndustryClassificationCode?: { _: string; name: string }[]
    PartyIdentification: { ID: { _: string; schemeID: string }[] }[]
    PostalAddress: {
      AddressLine: { Line: { _: string }[] }[]
      CityName: { _: string }[]
      PostalZone?: { _: string }[]
      CountrySubentityCode: { _: string }[]
      Country: { IdentificationCode: { _: string; listID: string; listAgencyID: string }[] }[]
    }[]
    PartyLegalEntity: {
      RegistrationName: { _: string }[]
    }[]
    Contact: {
      Telephone: { _: string }[]
      ElectronicMail: { _: string }[]
    }[]
  }[]
}

export interface UBLTaxTotal {
  TaxAmount: { _: number; currencyID: string }[]
  TaxSubtotal: {
    TaxableAmount: { _: number; currencyID: string }[]
    TaxAmount: { _: number; currencyID: string }[]
    TaxCategory: {
      ID: { _: string }[]
      TaxScheme: {
        ID: { _: string; schemeID: string; schemeAgencyID: string }[]
      }[]
    }[]
  }[]
}

export interface UBLLegalMonetaryTotal {
  LineExtensionAmount: { _: number; currencyID: string }[]
  TaxExclusiveAmount: { _: number; currencyID: string }[]
  TaxInclusiveAmount: { _: number; currencyID: string }[]
  PayableAmount: { _: number; currencyID: string }[]
}

export interface UBLInvoiceLine {
  ID: { _: string }[]
  InvoicedQuantity: { _: number; unitCode: string }[]
  LineExtensionAmount: { _: number; currencyID: string }[]
  TaxTotal: UBLTaxTotal[]
  Item: {
    Description: { _: string }[]
    CommodityClassification: {
      ItemClassificationCode: { _: string; listID: string }[]
    }[]
  }[]
  Price: {
    PriceAmount: { _: number; currencyID: string }[]
  }[]
  ItemPriceExtension: {
    Amount: { _: number; currencyID: string }[]
  }[]
}

// ─── Tenant Settings for MyInvois ────────────────────────────────────────────

export interface MyInvoisSettings {
  clientId: string
  clientSecret: string
  tin: string
  brn: string
  msicCode: string
  businessDesc: string
  environment: 'SANDBOX' | 'PRODUCTION'
  enabled: boolean
  // Company details from tenant settings
  companyName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postcode: string
  country: string
  sstRegNo?: string
}

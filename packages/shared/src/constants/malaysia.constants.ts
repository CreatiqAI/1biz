// Malaysian States
export const MY_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
] as const

// SST Rates (as of 2024)
export const SST_RATES = {
  SERVICE_TAX: 8, // 8% service tax
  SALES_TAX_5: 5, // 5% sales tax (essential goods)
  SALES_TAX_10: 10, // 10% sales tax (standard)
  EXEMPT: 0, // SST exempt
} as const

// EPF (KWSP) Contribution Rates
export const EPF_RATES = {
  EMPLOYEE: {
    DEFAULT: 11, // 11% for age < 60
    ABOVE_60: 5.5, // 5.5% for age >= 60
    VOLUNTARY_ZERO: 0, // opt for 0% (allowed)
  },
  EMPLOYER: {
    SALARY_BELOW_5000: 13, // 13% if salary <= RM 5,000
    SALARY_ABOVE_5000: 12, // 12% if salary > RM 5,000
    ABOVE_60: 6, // 6% if employee age >= 60
    FOREIGN_WORKER: 5, // 5% flat for foreign workers
  },
} as const

// SOCSO Contribution Caps
export const SOCSO = {
  MAX_INSURED_WAGE: 500000, // Max insurable wage in sen = RM 5,000
  FIRST_MONTH_EMPLOYMENT_SCHEME: 'first_category', // Employment Injury + Invalidity
  EMPLOYMENT_INJURY_SCHEME: 'second_category', // Employment Injury only (age >= 60)
} as const

// EIS Contribution Caps
export const EIS = {
  MAX_INSURED_WAGE: 500000, // Max insurable wage in sen = RM 5,000
  EMPLOYEE_RATE: 0.2, // 0.2%
  EMPLOYER_RATE: 0.2, // 0.2%
} as const

// Malaysian Banks
export const MY_BANKS = [
  { code: 'MBB', name: 'Maybank', swiftCode: 'MBBEMYKL' },
  { code: 'CIMB', name: 'CIMB Bank', swiftCode: 'CIBBMYKL' },
  { code: 'PBB', name: 'Public Bank', swiftCode: 'PBBEMYKL' },
  { code: 'RHB', name: 'RHB Bank', swiftCode: 'RHBBMYKL' },
  { code: 'HLB', name: 'Hong Leong Bank', swiftCode: 'HLBBMYKL' },
  { code: 'AMB', name: 'AmBank', swiftCode: 'ARBKMYKL' },
  { code: 'BIMB', name: 'Bank Islam', swiftCode: 'BIMBMYKL' },
  { code: 'BSN', name: 'Bank Simpanan Nasional', swiftCode: 'BSNAMYKL' },
  { code: 'AGRO', name: 'AgroBank', swiftCode: 'AGROMYKL' },
  { code: 'BOCM', name: 'Bank of China Malaysia', swiftCode: 'BKCHMYKL' },
  { code: 'SCB', name: 'Standard Chartered', swiftCode: 'SCBLMYKX' },
  { code: 'HSBC', name: 'HSBC Bank Malaysia', swiftCode: 'HBMBMYKL' },
  { code: 'OCBC', name: 'OCBC Bank Malaysia', swiftCode: 'OCBCMYKL' },
  { code: 'UOB', name: 'UOB Malaysia', swiftCode: 'UOVBMYKL' },
] as const

// Currency
export const DEFAULT_CURRENCY = 'MYR'
export const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur'
export const DEFAULT_DATE_FORMAT = 'DD/MM/YYYY'
export const DEFAULT_LOCALE = 'ms-MY'

// MyInvois e-Invoicing
export const MYINVOIS = {
  SANDBOX_URL: 'https://preprod-api.myinvois.hasil.gov.my',
  PRODUCTION_URL: 'https://api.myinvois.hasil.gov.my',
  DOCUMENT_VERSION: '1.0',
} as const

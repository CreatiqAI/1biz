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

// SOCSO Contribution Caps (PERKESO 2024)
export const SOCSO = {
  MAX_INSURED_WAGE: 600_000, // Max insurable wage in sen = RM 6,000
  FIRST_MONTH_EMPLOYMENT_SCHEME: 'first_category', // Employment Injury + Invalidity
  EMPLOYMENT_INJURY_SCHEME: 'second_category', // Employment Injury only (age >= 60)
} as const

// EIS Contribution Caps (PERKESO 2024)
export const EIS = {
  MAX_INSURED_WAGE: 600_000, // Max insurable wage in sen = RM 6,000
  EMPLOYEE_RATE: 0.2, // 0.2%
  EMPLOYER_RATE: 0.2, // 0.2%
} as const

// PCB Tax Reliefs (LHDN 2024)
export const PCB_RELIEFS = {
  PERSONAL: 9_000,            // RM 9,000 for individual
  SPOUSE: 4_000,              // RM 4,000 if spouse not working
  CHILD_UNDER_18: 2_000,      // RM 2,000 per child under 18
  CHILD_HIGHER_ED: 8_000,     // RM 8,000 per child in higher education
  EPF_MAX: 4_000,             // Max EPF relief for PCB
  LIFE_INSURANCE_MAX: 3_000,  // Max life insurance relief
} as const

// Employment Act Defaults (Peninsular Malaysia)
export const EMPLOYMENT_ACT = {
  // Working hours
  MAX_WEEKLY_HOURS: 45,
  MAX_DAILY_HOURS: 8,
  MAX_DAILY_HOURS_REDISTRIBUTED: 9,
  BREAK_AFTER_CONSECUTIVE_HOURS: 5,
  MIN_BREAK_MINUTES: 30,
  // Overtime multipliers
  OT_NORMAL_DAY: 1.5,
  OT_REST_DAY: 2.0,
  OT_PUBLIC_HOLIDAY: 3.0,
  // Leave tiers by years of service
  ANNUAL_LEAVE: { UNDER_2: 8, FROM_2_TO_5: 12, ABOVE_5: 16 },
  SICK_LEAVE: { UNDER_2: 14, FROM_2_TO_5: 18, ABOVE_5: 22 },
  HOSPITALIZATION_LEAVE: 60,
  MATERNITY_LEAVE_DAYS: 98,
  PATERNITY_LEAVE_DAYS: 7,
  PATERNITY_MAX_CONFINEMENTS: 5,
  PATERNITY_MIN_SERVICE_MONTHS: 12,
  // Termination notice (weeks)
  NOTICE_WEEKS: { UNDER_2: 4, FROM_2_TO_5: 6, ABOVE_5: 8 },
  // Termination benefits (days wages per year of service)
  TERMINATION_BENEFITS: { UNDER_2: 10, FROM_2_TO_5: 15, ABOVE_5: 20 },
  // Minimum wage (sen)
  MINIMUM_WAGE_SEN: 170_000, // RM 1,700/month
  // Public holidays
  GAZETTED_HOLIDAYS: 11,
  MANDATORY_HOLIDAYS: ['National Day', 'YDPA Birthday', 'State Ruler/FT Day', 'Workers Day', 'Malaysia Day'],
  // Record retention
  REGISTER_RETENTION_YEARS: 6,
  TAX_RETENTION_YEARS: 7,
  // Wage period
  MAX_WAGE_PERIOD_MONTHS: 1,
  WAGE_PAYMENT_DEADLINE_DAYS: 7,
} as const

// Malaysian Public Holidays (2026 defaults — dates should be updated yearly)
export const DEFAULT_PUBLIC_HOLIDAYS_2026 = [
  { name: 'New Year', date: '2026-01-01', mandatory: false },
  { name: 'Thaipusam', date: '2026-01-25', mandatory: false },
  { name: 'Nuzul Al-Quran', date: '2026-02-17', mandatory: false },
  { name: 'Hari Raya Aidilfitri', date: '2026-03-10', mandatory: false },
  { name: 'Hari Raya Aidilfitri (2nd day)', date: '2026-03-11', mandatory: false },
  { name: 'Workers Day', date: '2026-05-01', mandatory: true },
  { name: 'Vesak Day', date: '2026-05-12', mandatory: false },
  { name: 'Hari Raya Haji', date: '2026-05-27', mandatory: false },
  { name: 'Awal Muharram', date: '2026-06-17', mandatory: false },
  { name: 'YDPA Birthday', date: '2026-06-01', mandatory: true },
  { name: 'Malaysia Day', date: '2026-09-16', mandatory: true },
  { name: 'Maulidur Rasul', date: '2026-08-26', mandatory: false },
  { name: 'Deepavali', date: '2026-10-20', mandatory: false },
  { name: 'National Day', date: '2026-08-31', mandatory: true },
  { name: 'Christmas Day', date: '2026-12-25', mandatory: false },
] as const

// HRD Corp Levy
export const HRD_CORP = {
  COMPULSORY_THRESHOLD: 10, // ≥10 Malaysian employees
  COMPULSORY_RATE: 0.01,    // 1%
  OPTIONAL_MIN: 5,          // 5-9 employees
  OPTIONAL_RATE: 0.005,     // 0.5%
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

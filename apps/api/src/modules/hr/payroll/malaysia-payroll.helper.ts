/**
 * Malaysian Statutory Payroll Calculations
 * Covers EPF (KWSP), SOCSO (PERKESO), EIS, PCB (MTD), and HRD Corp
 *
 * All monetary values are in sen (1 MYR = 100 sen).
 * Reference: LHDN, KWSP, PERKESO official guidelines (2024)
 */

export interface StatutoryResult {
  epfEmployee: number
  epfEmployer: number
  socsoEmployee: number
  socsoEmployer: number
  eisEmployee: number
  eisEmployer: number
  pcb: number
}

export interface PCBProfile {
  maritalStatus?: string   // SINGLE, MARRIED, DIVORCED, WIDOWED
  spouseWorking?: boolean
  childrenCount?: number
}

/**
 * Calculate EPF (KWSP) contributions.
 *
 * Malaysian employees:
 *   Age < 60:  Employee 11%, Employer 13% (≤RM5,000) or 12% (>RM5,000)
 *   Age ≥ 60:  Employee 0%, Employer 4%
 *
 * Non-Malaysian employees:
 *   Employee RM5 flat, Employer 5% of gross
 */
export function calculateEPF(
  grossSalarySen: number,
  ageYears: number,
  isMalaysian: boolean = true,
): { employee: number; employer: number } {
  if (!isMalaysian) {
    return {
      employee: 500, // RM5 flat = 500 sen
      employer: Math.round(grossSalarySen * 0.05),
    }
  }

  if (ageYears >= 60) {
    return {
      employee: 0,
      employer: Math.round(grossSalarySen * 0.04),
    }
  }

  const employee = Math.round(grossSalarySen * 0.11) // 11% standard rate
  const employerRate = grossSalarySen <= 500_000 ? 0.13 : 0.12
  const employer = Math.round(grossSalarySen * employerRate)

  return { employee, employer }
}

/**
 * Calculate SOCSO (PERKESO) contributions.
 *
 * Wage ceiling: RM6,000/month (600,000 sen) — updated 2024
 *
 * Employees < 60 — Insured Scheme (Category 1):
 *   Employee:  0.5%  of SOCSO wages
 *   Employer:  1.75% of SOCSO wages
 *
 * Employees ≥ 60 — Employment Injury Scheme only (Category 2):
 *   Employee:  0% (exempt)
 *   Employer:  1.25% of SOCSO wages
 */
export function calculateSOCSO(
  grossSalarySen: number,
  ageYears: number,
): { employee: number; employer: number } {
  const socsoWageSen = Math.min(grossSalarySen, 600_000) // RM6,000 ceiling

  if (ageYears >= 60) {
    return {
      employee: 0,
      employer: Math.round(socsoWageSen * 0.0125),
    }
  }

  return {
    employee: Math.round(socsoWageSen * 0.005),
    employer: Math.round(socsoWageSen * 0.0175),
  }
}

/**
 * Calculate EIS (Employment Insurance System) contributions.
 *
 * Wage ceiling: RM6,000/month (600,000 sen) — updated 2024
 * Both employee and employer: 0.2% each
 * Employees ≥ 57: exempt from EIS
 */
export function calculateEIS(
  grossSalarySen: number,
  ageYears: number,
): { employee: number; employer: number } {
  if (ageYears >= 57) {
    return { employee: 0, employer: 0 }
  }

  const eisWageSen = Math.min(grossSalarySen, 600_000) // RM6,000 ceiling
  const amount = Math.round(eisWageSen * 0.002)

  return { employee: amount, employer: amount }
}

/**
 * Calculate PCB / MTD (Monthly Tax Deduction).
 *
 * Enhanced method with marital status and dependant reliefs:
 *   1. Annualise the gross monthly salary.
 *   2. Deduct reliefs: personal (RM9,000), spouse (RM4,000 if not working),
 *      children (RM2,000 each), EPF (up to RM4,000).
 *   3. Apply progressive tax brackets (2024 rates).
 *   4. Divide annual tax by 12 to get monthly PCB.
 */
export function calculatePCB(
  grossSalarySen: number,
  epfEmployeeSen: number,
  profile?: PCBProfile,
): number {
  const grossMonthlyRM = grossSalarySen / 100
  const annualIncomeRM = grossMonthlyRM * 12

  // Reliefs
  const personalRelief = 9_000
  const epfRelief = Math.min((epfEmployeeSen / 100) * 12, 4_000)

  let spouseRelief = 0
  let childRelief = 0

  if (profile) {
    // Spouse relief: RM4,000 if married and spouse not working
    if (
      (profile.maritalStatus === 'MARRIED') &&
      profile.spouseWorking === false
    ) {
      spouseRelief = 4_000
    }
    // Child relief: RM2,000 per child (under 18, simplified)
    if (profile.childrenCount && profile.childrenCount > 0) {
      childRelief = profile.childrenCount * 2_000
    }
  }

  const totalRelief = personalRelief + epfRelief + spouseRelief + childRelief
  const chargeableIncome = Math.max(0, annualIncomeRM - totalRelief)

  // 2024 progressive tax brackets
  let annualTax = 0

  if (chargeableIncome <= 5_000) {
    annualTax = 0
  } else if (chargeableIncome <= 20_000) {
    annualTax = (chargeableIncome - 5_000) * 0.01
  } else if (chargeableIncome <= 35_000) {
    annualTax = 150 + (chargeableIncome - 20_000) * 0.03
  } else if (chargeableIncome <= 50_000) {
    annualTax = 600 + (chargeableIncome - 35_000) * 0.08
  } else if (chargeableIncome <= 70_000) {
    annualTax = 1_800 + (chargeableIncome - 50_000) * 0.13
  } else if (chargeableIncome <= 100_000) {
    annualTax = 4_400 + (chargeableIncome - 70_000) * 0.21
  } else if (chargeableIncome <= 250_000) {
    annualTax = 10_700 + (chargeableIncome - 100_000) * 0.24
  } else if (chargeableIncome <= 400_000) {
    annualTax = 46_700 + (chargeableIncome - 250_000) * 0.245
  } else if (chargeableIncome <= 600_000) {
    annualTax = 83_450 + (chargeableIncome - 400_000) * 0.25
  } else if (chargeableIncome <= 1_000_000) {
    annualTax = 133_450 + (chargeableIncome - 600_000) * 0.26
  } else {
    annualTax = 237_450 + (chargeableIncome - 1_000_000) * 0.28
  }

  // Convert annual tax to monthly PCB in sen
  return Math.round((annualTax / 12) * 100)
}

/**
 * Calculate HRD Corp levy for the company.
 * ≥10 Malaysian employees: 1% of total wages (compulsory)
 * 5-9 Malaysian employees: 0.5% of total wages (optional)
 */
export function calculateHRDCorpLevy(
  totalMalaysianEmployeeWagesSen: number,
  malaysianEmployeeCount: number,
  optedIn: boolean = false,
): number {
  if (malaysianEmployeeCount >= 10) {
    return Math.round(totalMalaysianEmployeeWagesSen * 0.01)
  }
  if (malaysianEmployeeCount >= 5 && optedIn) {
    return Math.round(totalMalaysianEmployeeWagesSen * 0.005)
  }
  return 0
}

/**
 * Calculate overtime pay.
 * Normal day OT: ≥1.5x hourly rate
 * Rest day OT: ≥2x hourly rate
 * Public holiday OT: ≥3x hourly rate
 */
export function calculateOvertimePay(
  basicSalarySen: number,
  normalOtHours: number,
  restDayOtHours: number,
  phOtHours: number,
): { normalOtSen: number; restDayOtSen: number; phOtSen: number; totalOtSen: number } {
  // Hourly rate = monthly salary / 26 days / 8 hours
  const hourlyRateSen = Math.round(basicSalarySen / 26 / 8)

  const normalOtSen = Math.round(hourlyRateSen * 1.5 * normalOtHours)
  const restDayOtSen = Math.round(hourlyRateSen * 2.0 * restDayOtHours)
  const phOtSen = Math.round(hourlyRateSen * 3.0 * phOtHours)

  return {
    normalOtSen,
    restDayOtSen,
    phOtSen,
    totalOtSen: normalOtSen + restDayOtSen + phOtSen,
  }
}

/**
 * Calculate termination notice period (weeks) based on years of service.
 */
export function getTerminationNoticeWeeks(yearsOfService: number): number {
  if (yearsOfService < 2) return 4
  if (yearsOfService < 5) return 6
  return 8
}

/**
 * Calculate termination/layoff benefits.
 * Must have ≥12 months continuous service.
 * <2 years: 10 days wages per year
 * 2-5 years: 15 days wages per year
 * >5 years: 20 days wages per year
 */
export function calculateTerminationBenefits(
  basicSalarySen: number,
  yearsOfService: number,
): number {
  if (yearsOfService < 1) return 0

  const dailyWageSen = Math.round(basicSalarySen / 26)
  let daysPerYear: number

  if (yearsOfService < 2) daysPerYear = 10
  else if (yearsOfService < 5) daysPerYear = 15
  else daysPerYear = 20

  return Math.round(dailyWageSen * daysPerYear * yearsOfService)
}

/**
 * Get leave entitlement days based on years of service (Employment Act 1955).
 */
export function getLeaveEntitlement(
  yearsOfService: number,
  type: 'ANNUAL' | 'SICK',
): number {
  if (type === 'ANNUAL') {
    if (yearsOfService < 2) return 8
    if (yearsOfService < 5) return 12
    return 16
  }
  // SICK (outpatient)
  if (yearsOfService < 2) return 14
  if (yearsOfService < 5) return 18
  return 22
}

/**
 * Compute all statutory deductions and contributions for one employee in one month.
 */
export function computeStatutory(
  grossSalarySen: number,
  dateOfBirth: Date | null,
  epfOptedOut: boolean,
  socsoOptedOut: boolean,
  eisOptedOut: boolean,
  isMalaysian: boolean = true,
  pcbProfile?: PCBProfile,
): StatutoryResult {
  const today = new Date()
  const ageYears = dateOfBirth
    ? Math.floor((today.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30

  const epf = epfOptedOut
    ? { employee: 0, employer: 0 }
    : calculateEPF(grossSalarySen, ageYears, isMalaysian)
  const socso = socsoOptedOut
    ? { employee: 0, employer: 0 }
    : calculateSOCSO(grossSalarySen, ageYears)
  const eis = eisOptedOut
    ? { employee: 0, employer: 0 }
    : calculateEIS(grossSalarySen, ageYears)
  const pcb = calculatePCB(grossSalarySen, epf.employee, pcbProfile)

  return {
    epfEmployee: epf.employee,
    epfEmployer: epf.employer,
    socsoEmployee: socso.employee,
    socsoEmployer: socso.employer,
    eisEmployee: eis.employee,
    eisEmployer: eis.employer,
    pcb,
  }
}

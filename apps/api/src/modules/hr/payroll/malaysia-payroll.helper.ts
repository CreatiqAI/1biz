/**
 * Malaysian Statutory Payroll Calculations
 * Covers EPF (KWSP), SOCSO (PERKESO), EIS, and PCB (MTD)
 *
 * All monetary values are in cents (1 MYR = 100 cents).
 * Reference: LHDN, KWSP, PERKESO official guidelines (2024)
 */

export interface StatutoryResult {
  epfEmployee: number   // cents
  epfEmployer: number   // cents
  socsoEmployee: number // sen
  socsoEmployer: number // sen
  eisEmployee: number   // cents
  eisEmployer: number   // cents
  pcb: number           // cents
}

/**
 * Calculate EPF (KWSP) contributions.
 *
 * Employee:
 *   - Age < 60: 9% of gross salary
 *   - Age >= 60: 0% (employer still contributes at reduced rate)
 *
 * Employer:
 *   - Age < 60, wages <= RM5,000: 13%
 *   - Age < 60, wages >  RM5,000: 12%
 *   - Age >= 60: 4%
 */
export function calculateEPF(
  grossSalarySen: number,
  ageYears: number,
): { employee: number; employer: number } {
  if (ageYears >= 60) {
    return {
      employee: 0,
      employer: Math.round(grossSalarySen * 0.04),
    }
  }

  const employee = Math.round(grossSalarySen * 0.09)
  const employerRate = grossSalarySen <= 500_000 ? 0.13 : 0.12 // RM5,000 = 500,000 sen
  const employer = Math.round(grossSalarySen * employerRate)

  return { employee, employer }
}

/**
 * Calculate SOCSO (PERKESO) contributions.
 *
 * Wage ceiling: RM4,000/month (400,000 sen)
 *
 * Employees < 60 — Insured Scheme (Schedule 1):
 *   Employee:  0.5%  of SOCSO wages
 *   Employer:  1.75% of SOCSO wages
 *
 * Employees >= 60 — Employment Injury Scheme only (Schedule 2):
 *   Employee:  0% (exempt)
 *   Employer:  1.25% of SOCSO wages
 */
export function calculateSOCSO(
  grossSalarySen: number,
  ageYears: number,
): { employee: number; employer: number } {
  const socsoWageSen = Math.min(grossSalarySen, 400_000)

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
 * Wage ceiling: RM4,000/month (400,000 sen)
 * Both employee and employer: 0.2% each
 * Employees >= 57: exempt from EIS
 */
export function calculateEIS(
  grossSalarySen: number,
  ageYears: number,
): { employee: number; employer: number } {
  if (ageYears >= 57) {
    return { employee: 0, employer: 0 }
  }

  const eisWageSen = Math.min(grossSalarySen, 400_000)
  const amount = Math.round(eisWageSen * 0.002)

  return { employee: amount, employer: amount }
}

/**
 * Calculate PCB / MTD (Monthly Tax Deduction).
 *
 * Simplified method:
 *   1. Annualise the gross monthly salary.
 *   2. Deduct personal relief (RM9,000) and EPF relief (up to RM4,000).
 *   3. Apply progressive tax brackets (2024 rates).
 *   4. Divide annual tax by 12 to get monthly PCB.
 *
 * Note: A full implementation requires marital status, spouse working status,
 * number of children, and other reliefs. This is a baseline single-individual
 * calculation suitable for the first release.
 */
export function calculatePCB(
  grossSalarySen: number,
  epfEmployeeSen: number,
): number {
  const grossMonthlyRM = grossSalarySen / 100
  const annualIncomeRM = grossMonthlyRM * 12

  // Standard reliefs (individual with no dependants)
  const personalRelief = 9_000
  const epfRelief = Math.min((epfEmployeeSen / 100) * 12, 4_000)
  const chargeableIncome = Math.max(0, annualIncomeRM - personalRelief - epfRelief)

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
 * Compute all statutory deductions and contributions for one employee in one month.
 */
export function computeStatutory(
  grossSalarySen: number,
  dateOfBirth: Date | null,
  epfOptedOut: boolean,
  socsoOptedOut: boolean,
  eisOptedOut: boolean,
): StatutoryResult {
  const today = new Date()
  const ageYears = dateOfBirth
    ? Math.floor((today.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30 // default assumption if DOB unknown

  const epf = epfOptedOut ? { employee: 0, employer: 0 } : calculateEPF(grossSalarySen, ageYears)
  const socso = socsoOptedOut ? { employee: 0, employer: 0 } : calculateSOCSO(grossSalarySen, ageYears)
  const eis = eisOptedOut ? { employee: 0, employer: 0 } : calculateEIS(grossSalarySen, ageYears)
  const pcb = calculatePCB(grossSalarySen, epf.employee)

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

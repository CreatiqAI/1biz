import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantSchema: string) {
    const [invoiceStats, employeeCount, lowStock, recentInvoices, recentPayments, revenueChart] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('SENT','PARTIAL','OVERDUE')) AS outstanding_count,
           COALESCE(SUM(balance_sen) FILTER (WHERE status IN ('SENT','PARTIAL','OVERDUE')), 0) AS outstanding_sen,
           COUNT(*) FILTER (WHERE status = 'PAID'
             AND DATE_TRUNC('month', issue_date) = DATE_TRUNC('month', NOW())) AS paid_this_month,
           COALESCE(SUM(total_sen) FILTER (WHERE status != 'CANCELLED'
             AND DATE_TRUNC('month', issue_date) = DATE_TRUNC('month', NOW())), 0) AS billed_this_month_sen,
           COALESCE(SUM(total_sen) FILTER (WHERE status != 'CANCELLED'
             AND DATE_TRUNC('month', issue_date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0) AS billed_last_month_sen,
           COUNT(*) AS total
         FROM "${tenantSchema}".invoices
         WHERE deleted_at IS NULL`,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS active FROM "${tenantSchema}".employees
         WHERE status IN ('ACTIVE','PROBATION') AND deleted_at IS NULL`,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS count
         FROM "${tenantSchema}".products p
         WHERE p.track_inventory = TRUE AND p.is_active = TRUE AND p.deleted_at IS NULL
           AND (SELECT COALESCE(SUM(sl.quantity),0)
                FROM "${tenantSchema}".stock_levels sl WHERE sl.product_id = p.id) <= p.reorder_point`,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT i.id, i.invoice_no, i.status, i.total_sen, i.balance_sen,
                i.issue_date, i.due_date, c.name AS contact_name
         FROM "${tenantSchema}".invoices i
         JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
         WHERE i.deleted_at IS NULL
         ORDER BY i.created_at DESC LIMIT 5`,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT p.payment_no, p.type, p.date, p.amount_sen, p.method, c.name AS contact_name
         FROM "${tenantSchema}".payments p
         JOIN "${tenantSchema}".contacts c ON c.id = p.contact_id
         WHERE p.deleted_at IS NULL
         ORDER BY p.date DESC LIMIT 5`,
      ),
      // Monthly revenue for last 6 months
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon YY') AS month,
                COALESCE(SUM(total_sen) FILTER (WHERE status != 'CANCELLED'), 0) AS billed_sen,
                COALESCE(SUM(total_sen) FILTER (WHERE status = 'PAID'), 0) AS collected_sen
         FROM "${tenantSchema}".invoices
         WHERE deleted_at IS NULL
           AND issue_date >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', issue_date)
         ORDER BY DATE_TRUNC('month', issue_date)`,
      ),
    ])

    return {
      invoices: {
        outstanding: {
          count: Number(invoiceStats[0]?.outstanding_count ?? 0),
          amountSen: Number(invoiceStats[0]?.outstanding_sen ?? 0),
        },
        billedThisMonthSen: Number(invoiceStats[0]?.billed_this_month_sen ?? 0),
        billedLastMonthSen: Number(invoiceStats[0]?.billed_last_month_sen ?? 0),
        total: Number(invoiceStats[0]?.total ?? 0),
      },
      employees: { active: Number(employeeCount[0]?.active ?? 0) },
      lowStock: { count: Number(lowStock[0]?.count ?? 0) },
      recentInvoices,
      recentPayments,
      revenueChart,
    }
  }

  async getAccountingStats(tenantSchema: string) {
    const [receivable, payable, revenueThisMonth, expensesThisMonth, recentInvoices, recentPayments] = await Promise.all([
      // Total receivable (outstanding invoices)
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(balance_sen), 0) AS total_sen
         FROM "${tenantSchema}".invoices
         WHERE status IN ('SENT','PARTIAL','OVERDUE') AND deleted_at IS NULL`,
      ),
      // Total payable (MADE payments this month — approximation)
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(amount_sen), 0) AS total_sen
         FROM "${tenantSchema}".payments
         WHERE type = 'MADE' AND deleted_at IS NULL`,
      ),
      // Revenue this month (received payments) + comparison
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COALESCE(SUM(amount_sen) FILTER (WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())), 0) AS this_month_sen,
           COALESCE(SUM(amount_sen) FILTER (WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0) AS last_month_sen
         FROM "${tenantSchema}".payments
         WHERE type = 'RECEIVED' AND deleted_at IS NULL`,
      ),
      // Expenses this month (made payments) + comparison
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COALESCE(SUM(amount_sen) FILTER (WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())), 0) AS this_month_sen,
           COALESCE(SUM(amount_sen) FILTER (WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0) AS last_month_sen
         FROM "${tenantSchema}".payments
         WHERE type = 'MADE' AND deleted_at IS NULL`,
      ),
      // Recent invoices (10)
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT i.id, i.invoice_no, i.status, i.total_sen, i.balance_sen,
                i.issue_date, i.due_date, c.name AS contact_name
         FROM "${tenantSchema}".invoices i
         JOIN "${tenantSchema}".contacts c ON c.id = i.contact_id
         WHERE i.deleted_at IS NULL
         ORDER BY i.created_at DESC LIMIT 10`,
      ),
      // Recent payments (10)
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT p.id, p.payment_no, p.type, p.date, p.amount_sen, p.method, c.name AS contact_name
         FROM "${tenantSchema}".payments p
         JOIN "${tenantSchema}".contacts c ON c.id = p.contact_id
         WHERE p.deleted_at IS NULL
         ORDER BY p.date DESC LIMIT 10`,
      ),
    ])

    const revThis = Number(revenueThisMonth[0]?.this_month_sen ?? 0)
    const revLast = Number(revenueThisMonth[0]?.last_month_sen ?? 0)
    const expThis = Number(expensesThisMonth[0]?.this_month_sen ?? 0)
    const expLast = Number(expensesThisMonth[0]?.last_month_sen ?? 0)

    return {
      receivable: {
        count: Number(receivable[0]?.count ?? 0),
        totalSen: Number(receivable[0]?.total_sen ?? 0),
      },
      payable: {
        count: Number(payable[0]?.count ?? 0),
        totalSen: Number(payable[0]?.total_sen ?? 0),
      },
      revenueThisMonth: {
        totalSen: revThis,
        growthPct: revLast > 0 ? Math.round((revThis - revLast) / revLast * 100) : null,
      },
      expensesThisMonth: {
        totalSen: expThis,
        growthPct: expLast > 0 ? Math.round((expThis - expLast) / expLast * 100) : null,
      },
      recentInvoices,
      recentPayments,
    }
  }

  async getHrStats(tenantSchema: string) {
    const [empStats, leaveToday, pendingLeave, lastPayroll, recentEmployees] = await Promise.all([
      // Employee counts by status
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('ACTIVE','PROBATION')) AS active,
           COUNT(*) FILTER (WHERE status = 'PROBATION') AS probation,
           COUNT(*) AS total
         FROM "${tenantSchema}".employees
         WHERE deleted_at IS NULL`,
      ),
      // On leave today
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS count
         FROM "${tenantSchema}".leave_requests
         WHERE status = 'APPROVED'
           AND start_date <= CURRENT_DATE
           AND end_date >= CURRENT_DATE`,
      ),
      // Pending leave requests
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS count
         FROM "${tenantSchema}".leave_requests
         WHERE status = 'PENDING'`,
      ),
      // Last payroll run
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, period_month, period_year, status, total_gross_sen, total_net_sen
         FROM "${tenantSchema}".payroll_runs
         ORDER BY period_year DESC, period_month DESC LIMIT 1`,
      ),
      // Recent employees (5)
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT e.id, e.employee_no, e.full_name, e.status, e.hire_date,
                d.name AS department_name, p.name AS position_name
         FROM "${tenantSchema}".employees e
         LEFT JOIN "${tenantSchema}".departments d ON d.id = e.department_id
         LEFT JOIN "${tenantSchema}".positions p ON p.id = e.position_id
         WHERE e.deleted_at IS NULL
         ORDER BY e.created_at DESC LIMIT 5`,
      ),
    ])

    const payroll = lastPayroll[0] ?? null

    return {
      employees: {
        active: Number(empStats[0]?.active ?? 0),
        probation: Number(empStats[0]?.probation ?? 0),
        total: Number(empStats[0]?.total ?? 0),
      },
      onLeaveToday: Number(leaveToday[0]?.count ?? 0),
      pendingLeave: Number(pendingLeave[0]?.count ?? 0),
      lastPayroll: payroll
        ? {
            month: payroll.period_month,
            year: payroll.period_year,
            status: payroll.status,
            totalNetSen: Number(payroll.total_net_sen ?? 0),
          }
        : null,
      recentEmployees,
    }
  }
}

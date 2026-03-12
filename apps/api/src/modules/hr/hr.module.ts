import { Module } from '@nestjs/common'
import { DepartmentsController } from './departments/departments.controller'
import { DepartmentsService } from './departments/departments.service'
import { PositionsController } from './positions/positions.controller'
import { PositionsService } from './positions/positions.service'
import { EmployeesController } from './employees/employees.controller'
import { EmployeesService } from './employees/employees.service'
import { LeaveController } from './leave/leave.controller'
import { LeaveService } from './leave/leave.service'
import { PayrollController } from './payroll/payroll.controller'
import { PayrollService } from './payroll/payroll.service'
import { HolidaysController } from './holidays/holidays.controller'
import { HolidaysService } from './holidays/holidays.service'
import { AttendanceController } from './attendance/attendance.controller'
import { AttendanceService } from './attendance/attendance.service'
import { ClaimsController } from './claims/claims.controller'
import { ClaimsService } from './claims/claims.service'

@Module({
  controllers: [
    DepartmentsController,
    PositionsController,
    EmployeesController,
    LeaveController,
    PayrollController,
    HolidaysController,
    AttendanceController,
    ClaimsController,
  ],
  providers: [
    DepartmentsService,
    PositionsService,
    EmployeesService,
    LeaveService,
    PayrollService,
    HolidaysService,
    AttendanceService,
    ClaimsService,
  ],
  exports: [
    DepartmentsService,
    PositionsService,
    EmployeesService,
    LeaveService,
    PayrollService,
    HolidaysService,
    AttendanceService,
    ClaimsService,
  ],
})
export class HrModule {}

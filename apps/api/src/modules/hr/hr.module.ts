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

@Module({
  controllers: [
    DepartmentsController,
    PositionsController,
    EmployeesController,
    LeaveController,
    PayrollController,
  ],
  providers: [
    DepartmentsService,
    PositionsService,
    EmployeesService,
    LeaveService,
    PayrollService,
  ],
  exports: [
    DepartmentsService,
    PositionsService,
    EmployeesService,
    LeaveService,
    PayrollService,
  ],
})
export class HrModule {}

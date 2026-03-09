import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { StockService, StockMovementDto } from './stock.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List stock movements (filterable by productId, type)' })
  async listMovements(
    @CurrentUser() user: CurrentUserData,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    return { success: true, data: await this.stockService.findAllMovements(user.tenantSchema, productId, type) }
  }

  @Get('low-stock')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get products with low stock' })
  async getLowStock(@CurrentUser() user: CurrentUserData) {
    return { success: true, data: await this.stockService.getLowStockProducts(user.tenantSchema) }
  }

  @Get(':productId')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get stock levels for a product' })
  async getStockLevel(
    @CurrentUser() user: CurrentUserData,
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return { success: true, data: await this.stockService.getStockLevel(user.tenantSchema, productId, warehouseId) }
  }

  @Post('movements')
  @Audit('stock_movement')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  @ApiOperation({ summary: 'Record a stock movement (receive, issue, adjust, transfer)' })
  async recordMovement(@CurrentUser() user: CurrentUserData, @Body() dto: StockMovementDto) {
    return {
      success: true,
      data: await this.stockService.recordMovement(user.tenantSchema, dto, user.userId),
    }
  }
}

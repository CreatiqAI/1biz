import { Module } from '@nestjs/common'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'
import { StockController } from './stock.controller'
import { StockService } from './stock.service'

@Module({
  controllers: [ProductsController, WarehousesController, StockController],
  providers: [ProductsService, WarehousesService, StockService],
  exports: [ProductsService, WarehousesService, StockService],
})
export class InventoryModule {}

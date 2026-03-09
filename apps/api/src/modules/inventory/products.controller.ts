import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ProductsService, CreateProductDto } from './products.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../auth/decorators/permissions.decorator'
import { Permission } from '@1biz/shared'
import { Audit } from '../audit/audit.decorator'

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List all products' })
  async findAll(@CurrentUser() user: CurrentUserData, @Query('search') search?: string) {
    return { success: true, data: await this.productsService.findAll(user.tenantSchema, search) }
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return { success: true, data: await this.productsService.findOne(user.tenantSchema, id) }
  }

  @Post()
  @Audit('product')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  @ApiOperation({ summary: 'Create a product' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateProductDto) {
    return { success: true, data: await this.productsService.create(user.tenantSchema, dto, user.userId) }
  }

  @Patch(':id')
  @Audit('product')
  @RequirePermissions(Permission.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Update a product' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return { success: true, data: await this.productsService.update(user.tenantSchema, id, dto, user.userId) }
  }
}

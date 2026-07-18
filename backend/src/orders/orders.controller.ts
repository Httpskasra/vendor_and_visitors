import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemDto, UpdatePaymentDto } from './dto/update-order-item.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto, @Request() req) {
    const buyerId = req.user.userId;
    const userRole = req.user.role;

    if (userRole === 'SHOP_OWNER') {
      if (dto.sellerId !== buyerId) {
        throw new ForbiddenException('شما فقط می‌توانید برای فروشگاه خود سفارش ثبت کنید');
      }
    }
    return this.ordersService.create(buyerId, dto);
  }

  @Get()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('my')
  myOrders(@Request() req) {
    return this.ordersService.findByBuyer(req.user.userId);
  }

  @Get('my-shop-orders')
  @Roles('SHOP_OWNER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  myShopOrders(@Request() req) {
    return this.ordersService.findBySeller(req.user.userId);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(+id, status);
  }

  // ---- Admin edit/delete items ----
  @Patch(':orderId/items/:itemId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  updateOrderItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateOrderItem(+orderId, +itemId, dto);
  }

  @Delete(':orderId/items/:itemId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  removeOrderItem(@Param('orderId') orderId: string, @Param('itemId') itemId: string) {
    return this.ordersService.removeOrderItem(+orderId, +itemId);
  }

  @Patch(':orderId/payment')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  updatePayment(@Param('orderId') orderId: string, @Body() dto: UpdatePaymentDto) {
    return this.ordersService.updatePayment(+orderId, dto.paidAmount);
  }

  @Get('seller-summary')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  getSellerSummary() {
    return this.ordersService.getSellerSummary();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const order = await this.ordersService.findOne(+id);
    if (!order) return null;

    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole === 'ADMIN') return order;
    if (userRole === 'SHOP_OWNER') {
      if (order.sellerId === userId) return order;
      throw new ForbiddenException('شما دسترسی به این سفارش ندارید');
    }
    if (order.userId === userId) return order;
    throw new ForbiddenException('شما دسترسی به این سفارش ندارید');
  }
}
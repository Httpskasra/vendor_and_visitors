import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemDto, UpdatePaymentDto } from './dto/update-order-item.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto, buyerId: number) {
    const seller = await this.prisma.user.findFirst({
      where: { id: dto.sellerId, role: 'SHOP_OWNER' },
    });
    if (!seller) throw new NotFoundException('فروشنده یافت نشد');

    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true },
    });
    const priceMap = new Map(products.map(p => [p.id, p.price || 0]));

    let totalAmount = 0;
    const orderItemsData = dto.items.map(item => {
      const unitPrice = priceMap.get(item.productId) ?? 0;
      totalAmount += item.quantity * unitPrice;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        note: item.note,
      };
    });

    return this.prisma.order.create({
      data: {
        sellerId: dto.sellerId,
        userId: buyerId,
        notes: dto.notes,
        totalAmount,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
        items: { create: orderItemsData },
      },
      include: {
        seller: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true, phone: true, role: true } },
        items: { include: { product: true } },
      },
    });
  }

  findAll() {
    return this.prisma.order.findMany({
      include: {
        seller: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true, phone: true, role: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByBuyer(buyerId: number) {
    return this.prisma.order.findMany({
      where: { userId: buyerId },
      include: {
        seller: { select: { id: true, name: true, phone: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findBySeller(sellerId: number) {
    return this.prisma.order.findMany({
      where: { sellerId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true, phone: true, role: true } },
        items: { include: { product: true } },
      },
    });
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // --- New admin methods ---

  async updateOrderItem(orderId: number, itemId: number, dto: UpdateOrderItemDto) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('آیتم سفارش یافت نشد');
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        note: dto.note,
      },
    });

    // Recalculate total amount of the order
    const allItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });
    const newTotal = allItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    return this.findOne(orderId);
  }

  async removeOrderItem(orderId: number, itemId: number) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('آیتم سفارش یافت نشد');
    }

    await this.prisma.orderItem.delete({ where: { id: itemId } });

    const remaining = await this.prisma.orderItem.findMany({ where: { orderId } });
    const newTotal = remaining.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    return { success: true };
  }

  async updatePayment(orderId: number, paidAmount: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
    if (paidAmount >= order.totalAmount) paymentStatus = 'PAID';
    else if (paidAmount > 0) paymentStatus = 'PARTIAL';

    return this.prisma.order.update({
      where: { id: orderId },
      data: { paidAmount, paymentStatus },
    });
  }

  async getSellerSummary() {
    const sellers = await this.prisma.user.findMany({
      where: { role: 'SHOP_OWNER' },
      select: { id: true, name: true, phone: true },
    });
    const summary = [];
    for (const seller of sellers) {
      const orders = await this.prisma.order.findMany({
        where: { sellerId: seller.id },
        select: { totalAmount: true, paidAmount: true },
      });
      const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
      const totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
      summary.push({
        ...seller,
        totalAmount,
        totalPaid,
        outstanding: totalAmount - totalPaid,
      });
    }
    return summary;
  }
}
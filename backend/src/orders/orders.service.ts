import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  UpdateOrderItemDto,
} from './dto/update-order-item.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
        quantityMain: true,
      },
    });

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(
          `محصول با شناسه ${item.productId} یافت نشد`,
        );
      }

      if (
        item.quantity <= 0 ||
        item.quantity > product.quantityMain
      ) {
        throw new BadRequestException(
          `تعداد درخواستی محصول "${product.name}" معتبر نیست`,
        );
      }

      return {
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl ?? null,
        unitPrice: product.price,
        quantity: item.quantity,
        note: item.note?.trim() || null,
      };
    });

    const totalAmount = orderItems.reduce(
      (total, item) => total + Number(item.unitPrice) * item.quantity,
      0,
    );

    return this.prisma.order.create({
      data: {
        userId,
        sellerId: dto.sellerId,
        notes: dto.notes?.trim() || null,
        totalAmount,
        items: { create: orderItems },
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

  async updateOrderItem(
    orderId: number,
    itemId: number,
    dto: UpdateOrderItemDto,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
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

    await this.recalculateOrderTotal(orderId);
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
    await this.recalculateOrderTotal(orderId);

    return { success: true };
  }

  async updatePayment(orderId: number, paidAmount: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';

    if (paidAmount >= order.totalAmount) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIAL';
    }

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

      const totalAmount = orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0,
      );
      const totalPaid = orders.reduce(
        (sum, order) => sum + order.paidAmount,
        0,
      );

      summary.push({
        ...seller,
        totalAmount,
        totalPaid,
        outstanding: totalAmount - totalPaid,
      });
    }

    return summary;
  }

  private async recalculateOrderTotal(orderId: number) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { quantity: true, unitPrice: true },
    });

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalAmount },
    });
  }
}

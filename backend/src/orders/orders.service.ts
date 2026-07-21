import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

function lineTotal(unitPrice: number, whole: number, partial: number, countPerUnit: number) {
  return unitPrice * (whole + partial / Math.max(1, countPerUnit));
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const productIds = [...new Set(dto.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          price: true,
          quantityMain: true,
          quantityPartial: true,
          unitType: true,
          subUnitType: true,
          countPerUnit: true,
        },
      });
      type OrderProduct = (typeof products)[number];
      const productMap = new Map<number, OrderProduct>(
        products.map((product): [number, OrderProduct] => [product.id, product]),
      );

      // ممکن است یک محصول چند بار در dto آمده باشد؛ مصرف را بر اساس کوچک‌ترین واحد جمع می‌کنیم.
      const requestedByProduct = new Map<number, number>();
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException(`محصول با شناسه ${item.productId} یافت نشد`);
        const whole = Math.max(0, Math.trunc(item.wholeQuantity ?? 0));
        const partial = Math.max(0, Math.trunc(item.partialQuantity ?? 0));
        if (whole === 0 && partial === 0) {
          throw new BadRequestException(`برای محصول «${product.name}» حداقل یک مقدار وارد کنید`);
        }
        const countPerUnit = Math.max(1, product.countPerUnit);
        const requested = whole * countPerUnit + partial;
        requestedByProduct.set(product.id, (requestedByProduct.get(product.id) ?? 0) + requested);
      }

      // اعتبارسنجی و کسر موجودی به صورت canonical: partial همیشه کمتر از countPerUnit است.
      for (const product of products) {
        const requested = requestedByProduct.get(product.id) ?? 0;
        if (requested === 0) continue;
        const countPerUnit = Math.max(1, product.countPerUnit);
        const available = product.quantityMain * countPerUnit + product.quantityPartial;
        if (requested > available) {
          throw new BadRequestException(`موجودی محصول «${product.name}» کافی نیست`);
        }
        const remaining = available - requested;
        const quantityMain = Math.floor(remaining / countPerUnit);
        const quantityPartial = remaining % countPerUnit;
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantityMain,
            quantityPartial,
            quantity: `${quantityMain}+${quantityPartial}`,
          },
        });
      }

      const orderItems = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const countPerUnit = Math.max(1, product.countPerUnit);
        const rawWhole = Math.max(0, Math.trunc(item.wholeQuantity ?? 0));
        const rawPartial = Math.max(0, Math.trunc(item.partialQuantity ?? 0));
        const totalRequested = rawWhole * countPerUnit + rawPartial;
        const whole = Math.floor(totalRequested / countPerUnit);
        const partial = totalRequested % countPerUnit;
        const price = Number(product.price || 0);
        return {
          productId: product.id,
          productName: product.name,
          productImageUrl: product.imageUrl ?? null,
          unitPrice: price,
          wholeQuantity: whole,
          partialQuantity: partial,
          quantity: whole,
          wholeUnitType: product.unitType || null,
          partialUnitType: product.subUnitType || null,
          countPerUnit,
          note: item.note?.trim() || null,
        };
      });

      const totalAmount = orderItems.reduce(
        (total, item) => total + lineTotal(item.unitPrice, item.wholeQuantity, item.partialQuantity, item.countPerUnit),
        0,
      );

      return tx.order.create({
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
    });
  }

  findAll() { return this.prisma.order.findMany({ include: { seller: { select: { id: true, name: true, phone: true } }, user: { select: { id: true, name: true, phone: true, role: true } }, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }); }
  findByBuyer(buyerId: number) { return this.prisma.order.findMany({ where: { userId: buyerId }, include: { seller: { select: { id: true, name: true, phone: true } }, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }); }
  findBySeller(sellerId: number) { return this.prisma.order.findMany({ where: { sellerId }, include: { user: { select: { id: true, name: true, phone: true } }, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }); }
  findOne(id: number) { return this.prisma.order.findUnique({ where: { id }, include: { seller: { select: { id: true, name: true, phone: true } }, user: { select: { id: true, name: true, phone: true, role: true } }, items: { include: { product: true } } } }); }
  async updateStatus(id: number, status: string) { return this.prisma.order.update({ where: { id }, data: { status: status as any } }); }

  async updateOrderItem(orderId: number, itemId: number, dto: UpdateOrderItemDto) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new NotFoundException('آیتم سفارش یافت نشد');
    const whole = dto.wholeQuantity ?? item.wholeQuantity;
    const partial = dto.partialQuantity ?? item.partialQuantity;
    if (whole < 0 || partial < 0 || (whole === 0 && partial === 0)) throw new BadRequestException('تعداد کلی و جزئی نامعتبر است');
    await this.prisma.orderItem.update({ where: { id: itemId }, data: { wholeQuantity: whole, partialQuantity: partial, quantity: whole, unitPrice: dto.unitPrice, countPerUnit: dto.countPerUnit, wholeUnitType: dto.wholeUnitType, partialUnitType: dto.partialUnitType, note: dto.note } });
    await this.recalculateOrderTotal(orderId);
    return this.findOne(orderId);
  }
  async removeOrderItem(orderId: number, itemId: number) { const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } }); if (!item || item.orderId !== orderId) throw new NotFoundException('آیتم سفارش یافت نشد'); await this.prisma.orderItem.delete({ where: { id: itemId } }); await this.recalculateOrderTotal(orderId); return { success: true }; }
  async updatePayment(orderId: number, paidAmount: number) { const order = await this.prisma.order.findUnique({ where: { id: orderId } }); if (!order) throw new NotFoundException('سفارش یافت نشد'); const paymentStatus = paidAmount >= order.totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID'; return this.prisma.order.update({ where: { id: orderId }, data: { paidAmount, paymentStatus } }); }
  async getSellerSummary() { const sellers = await this.prisma.user.findMany({ where: { role: 'SHOP_OWNER' }, select: { id: true, name: true, phone: true } }); return Promise.all(sellers.map(async seller => { const orders = await this.prisma.order.findMany({ where: { sellerId: seller.id }, select: { totalAmount: true, paidAmount: true } }); const totalAmount = orders.reduce((s,o)=>s+o.totalAmount,0); const totalPaid = orders.reduce((s,o)=>s+o.paidAmount,0); return {...seller,totalAmount,totalPaid,outstanding:totalAmount-totalPaid}; })); }
  private async recalculateOrderTotal(orderId: number) { const items = await this.prisma.orderItem.findMany({ where: { orderId }, select: { wholeQuantity: true, partialQuantity: true, countPerUnit: true, unitPrice: true } }); const totalAmount = items.reduce((sum,item)=>sum+lineTotal(item.unitPrice,item.wholeQuantity,item.partialQuantity,item.countPerUnit),0); await this.prisma.order.update({ where: { id: orderId }, data: { totalAmount } }); }
  async getDashboardStats() { const [productsCount, ordersCount] = await Promise.all([this.prisma.product.count(), this.prisma.order.count()]); return { productsCount, ordersCount }; }
}

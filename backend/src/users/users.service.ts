import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { name: string; phone: string; password: string; role: string }) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('شماره موبایل قبلاً ثبت شده است');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        password: hashedPassword,
        role: dto.role as any,
      },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
    });
    return user;
  }

  async search(dto: SearchUsersDto, forcedRole?: Role) {
    const { q, role, dateFrom, dateTo, cursor, limit = 20 } = dto;
    const numericId = q && /^\d+$/.test(q) ? Number(q) : undefined;
    const where: Prisma.UserWhereInput = {
      role: forcedRole ?? role ?? { in: ['VISITOR', 'SHOP_OWNER'] },
      ...(cursor && { id: { lt: cursor } }),
      ...(q && {
        OR: [
          ...(numericId ? [{ id: numericId }] : []),
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };
    const countWhere = { ...where };
    delete (countWhere as any).id;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: limit + 1,
        select: { id: true, name: true, phone: true, role: true, createdAt: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.user.count({ where: countWhere }),
    ]);
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    return {
      data,
      pagination: {
        limit,
        total,
        hasNextPage,
        nextCursor: hasNextPage ? data[data.length - 1].id : null,
      },
    };
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
    });
  }

  async changePassword(userId: number, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
  return { message: 'رمز عبور با موفقیت تغییر کرد' };
}
async remove(userId: number) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new NotFoundException('کاربر یافت نشد');
  }
  if (user.role === 'ADMIN') {
    throw new ForbiddenException('حذف حساب ادمین مجاز نیست');
  }

  const ordersCount = await this.prisma.order.count({
    where: { OR: [{ userId }, { sellerId: userId }] },
  });
  if (ordersCount > 0) {
    throw new ConflictException('این کاربر دارای سابقه سفارش است و برای حفظ سوابق قابل حذف نیست');
  }

  await this.prisma.user.delete({ where: { id: userId } });
  return { success: true, message: 'کاربر با موفقیت حذف شد' };
}

async createSeller(dto: { name: string; phone: string; password: string }) {
  const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
  if (existing) throw new ConflictException('شماره موبایل قبلاً ثبت شده است');

  const hashedPassword = await bcrypt.hash(dto.password, 10);
  const user = await this.prisma.user.create({
    data: {
      name: dto.name,
      phone: dto.phone,
      password: hashedPassword,
      role: 'SHOP_OWNER',
    },
    select: { id: true, name: true, phone: true, role: true, createdAt: true },
  });
  return user;
}
}

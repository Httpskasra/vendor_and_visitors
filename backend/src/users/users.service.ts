import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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

  findAll() {
    return this.prisma.user.findMany({
      where: { role: { in: ['VISITOR', 'SHOP_OWNER'] } },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
    });
  }

  findSellers() {
    return this.prisma.user.findMany({
      where: { role: 'SHOP_OWNER' },
      select: { id: true, name: true, phone: true },
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
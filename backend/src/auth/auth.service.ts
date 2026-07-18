// auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // فقط نقش‌های SHOP_OWNER و VISITOR مجاز است (ادمین از طریق seed ساخته شود)
    if (dto.role && dto.role !== Role.SHOP_OWNER && dto.role !== Role.VISITOR) {
      throw new BadRequestException('نقش وارد شده معتبر نیست');
    }

    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException('این شماره قبلاً ثبت شده است');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        password: hashed,
        role: dto.role || Role.VISITOR,
      },
    });

    const token = this.jwtService.sign({ sub: user.id, role: user.role });
    return {
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('شماره یا رمز عبور اشتباه است');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('شماره یا رمز عبور اشتباه است');

    const token = this.jwtService.sign({ sub: user.id, role: user.role });
    return {
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    };
  }
}
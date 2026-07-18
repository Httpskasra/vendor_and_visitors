import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto, SortField, SortOrder } from './dto/search-products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(batchId?: number) {
    return this.prisma.product.findMany({
      where: batchId ? { batchId } : undefined,
      include: { batch: true },
      orderBy: { name: 'asc' },
    });
  }

  async findLatest() {
  const latestBatch = await this.prisma.uploadBatch.findFirst({
    orderBy: { uploadedAt: 'desc' },
    include: { products: { orderBy: { name: 'asc' } } },
  });
  return latestBatch || { products: [] };
  }

  // findAllBatches() {
  //   return this.prisma.uploadBatch.findMany({
  //     orderBy: { uploadedAt: 'desc' },
  //     include: { _count: { select: { products: true } } },
  //   });
  // }
  async updateProduct(id: number, dto: UpdateProductDto) {
  return this.prisma.product.update({
    where: { id },
    data: {
      categoryMain: dto.categoryMain,
      categorySecond: dto.categorySecond,
      imageUrl: dto.imageUrl,
    },
  });
}
 // ── Advanced Search ──────────────────────────────────────────────────────

  async search(dto: SearchProductsDto) {
    const {
      name,
      categoryMain,
      categorySecond,
      unitType,
      priceMin,
      priceMax,
      quantityMin,
      quantityMax,
      batchId,
      sortBy = SortField.NAME,
      sortOrder = SortOrder.ASC,
      cursor,
      limit = 20,
    } = dto;

    // ── WHERE ──────────────────────────────────────────────────────
    const where: Prisma.ProductWhereInput = {
      // جستجو روی nameNormalized اگر موجود باشد، وگرنه name
      // هر دو را چک می‌کنیم تا با داده‌های قدیمی هم کار کند
      ...(name && {
        OR: [
          // جستجو روی فیلد نرمال‌شده (دقیق‌تر)
          {
            nameNormalized: {
              contains: name,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
          // fallback روی name اصلی (برای داده‌های قدیمی بدون nameNormalized)
          {
            name: {
              contains: name,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        ],
      }),

      ...(categoryMain && {
        categoryMain: {
          contains: categoryMain,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      }),

      ...(categorySecond && {
        categorySecond: {
          contains: categorySecond,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      }),

      ...(unitType && { unitType }),

      ...((priceMin !== undefined || priceMax !== undefined) && {
        price: {
          ...(priceMin !== undefined && { gte: priceMin }),
          ...(priceMax !== undefined && { lte: priceMax }),
        },
      }),

      ...((quantityMin !== undefined || quantityMax !== undefined) && {
        quantityMain: {
          ...(quantityMin !== undefined && { gte: quantityMin }),
          ...(quantityMax !== undefined && { lte: quantityMax }),
        },
      }),

      ...(batchId && { batchId }),
    };

    // ── ORDER BY ───────────────────────────────────────────────────
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      ...(sortBy !== SortField.ID ? [{ id: sortOrder }] : []),
    ];

    // ── FETCH (limit + 1 برای hasNextPage) ────────────────────────
    const take = limit + 1;

    const items = await this.prisma.product.findMany({
      where,
      orderBy,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take,
      include: { batch: { select: { id: true, uploadedAt: true } } },
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      pagination: { limit, nextCursor, hasNextPage },
    };
  }
}

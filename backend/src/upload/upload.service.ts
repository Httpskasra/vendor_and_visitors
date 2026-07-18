// backend/src/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { normalizePersian } from 'src/utils/persian-normalize';

interface ExcelRow {
  'نام كالا'?: string;
  'نام کالا'?: string;
  'نوع واحد كلي'?: string;
  'نوع واحد کلی'?: string;
  'نوع واحد جزء'?: string;
  'تعداد در واحد'?: number | string;
  'گروه کالا'?: string;
  'گروه کالا دوم'?: string;
  'تعداد'?: string | number;
  'قيمت اول'?: number | string;
}

function parseQuantity(raw: string | number | undefined): { main: number; bonus: number } {
  if (raw === undefined || raw === null) return { main: 0, bonus: 0 };
  const str = String(raw).trim();
  const match = str.match(/^(\d+)\+(\d+)$/);
  if (match) return { main: parseInt(match[1]), bonus: parseInt(match[2]) };
  const num = parseInt(str);
  return { main: isNaN(num) ? 0 : num, bonus: 0 };
}

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async processExcel(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایلی انتخاب نشده است');

    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) throw new BadRequestException('فایل اکسل خالی است');

    // Create new batch record
    const batch = await this.prisma.uploadBatch.create({
      data: { filename: file.originalname },
    });

    const productsToCreate = [];

    for (const row of rows) {
      const name = String(row['نام كالا'] || row['نام کالا'] || '').trim();
      if (!name) continue;

      // Find existing product by exact name (case-insensitive) from any batch
      // We use the most recent batch to get the latest metadata
      const existing = await this.prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        orderBy: { batch: { uploadedAt: 'desc' } },
      });

      const { main, bonus } = parseQuantity(row['تعداد']);
      
      // Priority: use price from Excel, otherwise from existing product, otherwise 0
      let price = 0;

      if (
        row['قيمت اول'] !== undefined &&
        row['قيمت اول'] !== null &&
        row['قيمت اول'] !== ''
      ) {
        const priceStr = String(row['قيمت اول']).replace(/,/g, '');

        price = Number(priceStr);

        if (isNaN(price)) price = 0;
      } else if (existing?.price !== undefined && existing?.price !== null) {
        price = existing.price;
      } else {
        price = 0;
      }

      productsToCreate.push({
        batchId: batch.id,
        name,
        nameNormalized: normalizePersian(name),
        unitType: String(row['نوع واحد كلي'] || row['نوع واحد کلی'] || '').trim(),
        subUnitType: String(row['نوع واحد جزء'] || '').trim(),
        countPerUnit: parseInt(String(row['تعداد در واحد'] || '1')) || 1,
        // Use existing categories if present, otherwise take from Excel or default
        categoryMain: existing?.categoryMain || String(row['گروه کالا'] || 'عمومی').trim(),
        categorySecond: existing?.categorySecond || (row['گروه کالا دوم'] ? String(row['گروه کالا دوم']).trim() : null),
        quantity: String(row['تعداد'] || '0'),
        quantityMain: main,
        quantityBonus: bonus,
        price,
        // Preserve image from existing product if any
        imageUrl: existing?.imageUrl || null,
      });
    }

    if (productsToCreate.length === 0) {
      throw new BadRequestException('هیچ محصول معتبری در فایل یافت نشد');
    }

    await this.prisma.product.createMany({ data: productsToCreate });

    return {
      message: `${productsToCreate.length} محصول با موفقیت بارگذاری شد`,
      batchId: batch.id,
      count: productsToCreate.length,
      preservedCount: productsToCreate.filter(p => p.imageUrl || p.categoryMain !== 'عمومی' || p.price > 0).length,
    };
  }
}
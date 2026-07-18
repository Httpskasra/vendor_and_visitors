import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { normalizePersian } from '../utils/persian-normalize';

interface ExcelRow {
  'نام كالا'?: string;
  'نام کالا'?: string;

  'نوع واحد كلي'?: string;
  'نوع واحد کلی'?: string;

  'نوع واحد جزء'?: string;
  'نوع واحد جز'?: string;

  'تعداد در واحد'?: number | string;

  'گروه کالا'?: string;
  'گروه كالا'?: string;

  'گروه کالا دوم'?: string;
  'گروه كالا دوم'?: string;

  'تعداد'?: string | number;

  // هر دو شکل عربی و فارسی
  'قيمت اول'?: number | string;
  'قیمت اول'?: number | string;
}

interface ParsedQuantity {
  main: number;
  bonus: number;
}

function parseQuantity(
  raw: string | number | undefined,
): ParsedQuantity {
  if (raw === undefined || raw === null) {
    return {
      main: 0,
      bonus: 0,
    };
  }

  const value = String(raw).trim();

  const bonusMatch = value.match(
    /^(\d+)\s*\+\s*(\d+)$/,
  );

  if (bonusMatch) {
    return {
      main: Number.parseInt(bonusMatch[1], 10),
      bonus: Number.parseInt(bonusMatch[2], 10),
    };
  }

  const parsed = Number.parseInt(value, 10);

  return {
    main: Number.isNaN(parsed) ? 0 : parsed,
    bonus: 0,
  };
}

function parseNumber(
  raw: string | number | undefined,
  fallback = 0,
): number {
  if (
    raw === undefined ||
    raw === null ||
    String(raw).trim() === ''
  ) {
    return fallback;
  }

  const normalizedValue = String(raw)
    .replace(/,/g, '')
    .replace(/٬/g, '')
    .replace(/\s/g, '')
    .trim();

  const parsed = Number(normalizedValue);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function getProductName(row: ExcelRow): string {
  return String(
    row['نام كالا'] ??
      row['نام کالا'] ??
      '',
  ).trim();
}

function getPrice(row: ExcelRow): number {
  return parseNumber(
    row['قيمت اول'] ??
      row['قیمت اول'],
    0,
  );
}

function getMainCategory(row: ExcelRow): string {
  return String(
    row['گروه کالا'] ??
      row['گروه كالا'] ??
      'عمومی',
  ).trim() || 'عمومی';
}

function getSecondCategory(
  row: ExcelRow,
): string | null {
  const category = String(
    row['گروه کالا دوم'] ??
      row['گروه كالا دوم'] ??
      '',
  ).trim();

  return category || null;
}

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async processExcel(
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'فایلی انتخاب نشده است',
      );
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(file.buffer, {
        type: 'buffer',
      });
    } catch {
      throw new BadRequestException(
        'فایل اکسل قابل خواندن نیست',
      );
    }

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException(
        'فایل اکسل هیچ Sheet معتبری ندارد',
      );
    }

    const sheet =
      workbook.Sheets[firstSheetName];

    const rows =
      XLSX.utils.sheet_to_json<ExcelRow>(
        sheet,
        {
          defval: '',
          raw: false,
        },
      );

    if (rows.length === 0) {
      throw new BadRequestException(
        'فایل اکسل خالی است',
      );
    }

    /*
     * ابتدا تمام اطلاعات فایل را آماده می‌کنیم.
     * تا قبل از معتبر شدن فایل، چیزی از دیتابیس حذف نمی‌شود.
     */
    const parsedProducts = rows
      .map((row) => {
        const name = getProductName(row);

        if (!name) {
          return null;
        }

        const normalizedName =
          normalizePersian(name);

        if (!normalizedName) {
          return null;
        }

        const {
          main,
          bonus,
        } = parseQuantity(row['تعداد']);

        const rawQuantity = String(
          row['تعداد'] ?? '0',
        ).trim();

        return {
          name,
          nameNormalized: normalizedName,

          unitType: String(
            row['نوع واحد كلي'] ??
              row['نوع واحد کلی'] ??
              '',
          ).trim(),

          subUnitType: String(
            row['نوع واحد جزء'] ??
              row['نوع واحد جز'] ??
              '',
          ).trim(),

          countPerUnit: Math.max(
            1,
            Math.trunc(
              parseNumber(
                row['تعداد در واحد'],
                1,
              ),
            ),
          ),

          categoryMain:
            getMainCategory(row),

          categorySecond:
            getSecondCategory(row),

          quantity: rawQuantity || '0',
          quantityMain: main,
          quantityBonus: bonus,

          price: getPrice(row),
        };
      })
      .filter(
        (
          product,
        ): product is NonNullable<
          typeof product
        > => product !== null,
      );

    if (parsedProducts.length === 0) {
      throw new BadRequestException(
        'هیچ محصول معتبری در فایل یافت نشد',
      );
    }

    /*
     * جلوگیری از ثبت محصول تکراری در یک فایل.
     * در صورت تکرار نام، آخرین سطر اکسل نگه داشته می‌شود.
     */
    const uniqueProductsMap = new Map<
      string,
      (typeof parsedProducts)[number]
    >();

    for (const product of parsedProducts) {
      uniqueProductsMap.set(
        product.nameNormalized,
        product,
      );
    }

    const uniqueProducts = Array.from(
      uniqueProductsMap.values(),
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * فقط عکس محصولات قبلی را نگه می‌داریم.
           * سایر اطلاعات از اکسل جدید خوانده می‌شود.
           */
          const oldProducts =
            await tx.product.findMany({
              where: {
                imageUrl: {
                  not: null,
                },
              },
              select: {
                name: true,
                nameNormalized: true,
                imageUrl: true,
              },
            });

          const imageByNormalizedName =
            new Map<string, string>();

          for (const oldProduct of oldProducts) {
            if (!oldProduct.imageUrl) {
              continue;
            }

            const normalizedName =
              oldProduct.nameNormalized ||
              normalizePersian(
                oldProduct.name,
              );

            /*
             * در صورت وجود چند نسخه قدیمی،
             * اولین عکس معتبر نگه داشته می‌شود.
             */
            if (
              normalizedName &&
              !imageByNormalizedName.has(
                normalizedName,
              )
            ) {
              imageByNormalizedName.set(
                normalizedName,
                oldProduct.imageUrl,
              );
            }
          }

          /*
           * قبل از حذف محصولات، snapshot سفارش‌های قدیمی را کامل می‌کنیم.
           * پس از حذف Product، تاریخچه سفارش دیگر به رابطه product وابسته نیست.
           */
          const linkedOrderItems = await tx.orderItem.findMany({
            where: { productId: { not: null } },
            select: {
              id: true,
              productName: true,
              productImageUrl: true,
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                },
              },
            },
          });

          for (const item of linkedOrderItems) {
            if (!item.product) continue;

            const missingName = !item.productName?.trim();
            const missingImage = !item.productImageUrl;

            if (!missingName && !missingImage) continue;

            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                ...(missingName && {
                  productName: item.product.name,
                }),
                ...(missingImage && item.product.imageUrl && {
                  productImageUrl: item.product.imageUrl,
                }),
              },
            });
          }

          /*
           * ابتدا محصولات حذف می‌شوند؛ چون به batch وابسته‌اند.
           */
          const deletedProducts =
            await tx.product.deleteMany();

          /*
           * سپس batchهای قدیمی حذف می‌شوند.
           */
          const deletedBatches =
            await tx.uploadBatch.deleteMany();

          /*
           * فقط یک batch جدید برای فایل فعلی ساخته می‌شود.
           */
          const newBatch =
            await tx.uploadBatch.create({
              data: {
                filename:
                  file.originalname,
              },
            });

          let preservedImageCount = 0;

          const productsToCreate:
            Prisma.ProductCreateManyInput[] =
            uniqueProducts.map(
              (product) => {
                const preservedImage =
                  imageByNormalizedName.get(
                    product.nameNormalized,
                  ) ?? null;

                if (preservedImage) {
                  preservedImageCount++;
                }

                return {
                  batchId: newBatch.id,

                  name: product.name,
                  nameNormalized:
                    product.nameNormalized,

                  unitType:
                    product.unitType,

                  subUnitType:
                    product.subUnitType,

                  countPerUnit:
                    product.countPerUnit,

                  /*
                   * دسته‌بندی از فایل جدید گرفته می‌شود،
                   * نه محصول قبلی.
                   */
                  categoryMain:
                    product.categoryMain,

                  categorySecond:
                    product.categorySecond,

                  quantity:
                    product.quantity,

                  quantityMain:
                    product.quantityMain,

                  quantityBonus:
                    product.quantityBonus,

                  /*
                   * قیمت فقط از اکسل جدید می‌آید.
                   */
                  price: product.price,

                  /*
                   * تنها مقدار باقی‌مانده از محصولات قبلی.
                   */
                  imageUrl:
                    preservedImage,
                };
              },
            );

          await tx.product.createMany({
            data: productsToCreate,
          });

          return {
            message:
              'فایل اکسل با موفقیت جایگزین شد',

            batchId: newBatch.id,

            filename:
              file.originalname,

            receivedRows: rows.length,

            importedCount:
              productsToCreate.length,

            duplicateRowsRemoved:
              parsedProducts.length -
              uniqueProducts.length,

            preservedImageCount,

            deletedOldProducts:
              deletedProducts.count,

            deletedOldBatches:
              deletedBatches.count,
          };
        },
        {
          timeout: 120_000,
        },
      );
    } catch (error) {
      console.error(
        'Excel replacement failed:',
        error,
      );

      throw new BadRequestException(
        'جایگزینی محصولات با فایل جدید انجام نشد. ممکن است محصولات به سفارش‌های قبلی متصل باشند یا ساختار فایل معتبر نباشد.',
      );
    }
  }
}
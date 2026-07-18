import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { normalizePersian } from '../../utils/persian-normalize';

export enum SortField {
  NAME = 'name',
  PRICE = 'price',
  QUANTITY_MAIN = 'quantityMain',
  CATEGORY_MAIN = 'categoryMain',
  ID = 'id',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SearchProductsDto {
  // ── Full-text search (فارسی + لاتین) ─────────────────────────────
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePersian(value) : value,
  )
  name?: string;

  // ── Category filters ──────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePersian(value) : value,
  )
  categoryMain?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePersian(value) : value,
  )
  categorySecond?: string;

  // ── Unit type filter ──────────────────────────────────────────────
  @IsOptional()
  @IsString()
  unitType?: string;

  // ── Price range ───────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  // ── Quantity range ────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityMax?: number;

  // ── Batch filter ──────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  batchId?: number;

  // ── Sorting ───────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.NAME;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  // ── Cursor-based pagination ───────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

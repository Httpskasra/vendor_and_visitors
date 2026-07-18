import { IsOptional, IsInt, IsNumber, Min, IsString } from 'class-validator';

export class UpdateOrderItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePaymentDto {
  @IsNumber()
  @Min(0)
  paidAmount: number;
}
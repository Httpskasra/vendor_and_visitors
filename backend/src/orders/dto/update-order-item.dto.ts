import { IsOptional, IsInt, IsNumber, Min, IsString } from 'class-validator';

export class UpdateOrderItemDto {
  @IsOptional() @IsInt() @Min(0) wholeQuantity?: number;
  @IsOptional() @IsInt() @Min(0) partialQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsInt() @Min(1) countPerUnit?: number;
  @IsOptional() @IsString() wholeUnitType?: string;
  @IsOptional() @IsString() partialUnitType?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdatePaymentDto {
  @IsNumber() @Min(0) paidAmount: number;
}

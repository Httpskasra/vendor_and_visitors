import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() categoryMain?: string;
  @IsOptional() @IsString() categorySecond?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() unitType?: string;
  @IsOptional() @IsString() subUnitType?: string;
  @IsOptional() @IsInt() @Min(1) countPerUnit?: number;
  @IsOptional() @IsInt() @Min(0) quantityMain?: number;
  @IsOptional() @IsInt() @Min(0) quantityPartial?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
}

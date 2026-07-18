import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  categoryMain?: string;

  @IsOptional()
  @IsString()
  categorySecond?: string;

  @IsOptional()
  @IsString()   // ← was @IsUrl(), now @IsString()
  imageUrl?: string;
}
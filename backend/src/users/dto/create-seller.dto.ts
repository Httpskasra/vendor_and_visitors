import { IsString, IsPhoneNumber, MinLength } from 'class-validator';

export class CreateSellerDto {
  @IsString()
  name: string;

  @IsPhoneNumber('IR')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
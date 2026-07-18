import { IsString, IsPhoneNumber, MinLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsPhoneNumber('IR')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn(['VISITOR', 'SHOP_OWNER'])
  role: 'VISITOR' | 'SHOP_OWNER';
}
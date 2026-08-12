import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Patch,
  Param,
  Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard, RolesGuard, Roles } from "../auth/guards";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateSellerDto } from "./dto/create-seller.dto";
import { SearchUsersDto } from "./dto/search-users.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles("ADMIN")
  @UseGuards(RolesGuard)
  findAll(@Query() query: SearchUsersDto) {
    return this.usersService.search(query);
  }

  @Post()
  @Roles("ADMIN")
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get("sellers")
  getSellers(@Query() query: SearchUsersDto) {
    return this.usersService.search(query, "SHOP_OWNER");
  }
  @Post('sellers')
async createSeller(@Body() dto: CreateSellerDto) {
  // Only allow creating SHOP_OWNER
  return this.usersService.createSeller(dto);
}

  @Get("me")
  getMe(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }
  @Patch(":id/password")
  @Roles("ADMIN")
  @UseGuards(RolesGuard)
  changePassword(@Param("id") id: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(+id, dto.newPassword);
  }
}

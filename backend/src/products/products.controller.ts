// products/products.controller.ts
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { JwtAuthGuard, Roles, RolesGuard } from "../auth/guards";
import { UpdateProductDto } from "./dto/update-product.dto";
import { SearchProductsDto } from "./dto/search-products.dto";

@Controller("products")
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}
  // @Get()
  // async findAllActive() {
  //   return this.productsService.findLatest();
  // }
  @Get()
  async findAll() {
    return this.productsService.findAll(); // returns array
  }

  @Get("latest")
  async findLatest() {
    return this.productsService.findLatest(); // returns { products: [] }
  }
    // ── GET /products/search ──────────────────────────────────────
  // Must be declared BEFORE :id to avoid route conflicts.
  //
  // Example requests:
  //   GET /products/search?name=milk&priceMin=5&priceMax=50&sortBy=price&sortOrder=asc&limit=20
  //   GET /products/search?categoryMain=dairy&cursor=42&limit=20
  @Get('search')
  async search(@Query() dto: SearchProductsDto) {
    return this.productsService.search(dto);
  }
  // @Get("batches")
  // findBatches() {
  //   return this.productsService.findAllBatches();
  // }
  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(+id, dto);
  }
}

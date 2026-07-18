-- CreateIndex
CREATE INDEX "Product_categoryMain_idx" ON "Product"("categoryMain");

-- CreateIndex
CREATE INDEX "Product_categorySecond_idx" ON "Product"("categorySecond");

-- CreateIndex
CREATE INDEX "Product_unitType_idx" ON "Product"("unitType");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_quantityMain_idx" ON "Product"("quantityMain");

-- CreateIndex
CREATE INDEX "Product_categoryMain_name_idx" ON "Product"("categoryMain", "name");

-- CreateIndex
CREATE INDEX "Product_categoryMain_price_idx" ON "Product"("categoryMain", "price");

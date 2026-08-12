-- B-tree indexes support scoped cursor pagination and structured filters.
CREATE INDEX "User_role_id_idx" ON "User"("role", "id");
CREATE INDEX "User_createdAt_id_idx" ON "User"("createdAt", "id");
CREATE INDEX "Order_sellerId_id_idx" ON "Order"("sellerId", "id");
CREATE INDEX "Order_userId_id_idx" ON "Order"("userId", "id");
CREATE INDEX "Order_status_id_idx" ON "Order"("status", "id");
CREATE INDEX "Order_paymentStatus_id_idx" ON "Order"("paymentStatus", "id");
CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");
CREATE INDEX "Order_totalAmount_id_idx" ON "Order"("totalAmount", "id");

-- Trigram indexes keep contains/ILIKE searches responsive on larger datasets.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "User_phone_trgm_idx" ON "User" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX "Order_notes_trgm_idx" ON "Order" USING GIN ("notes" gin_trgm_ops);
CREATE INDEX "OrderItem_productName_trgm_idx" ON "OrderItem" USING GIN ("productName" gin_trgm_ops);
CREATE INDEX "OrderItem_note_trgm_idx" ON "OrderItem" USING GIN ("note" gin_trgm_ops);

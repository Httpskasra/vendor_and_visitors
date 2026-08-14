-- Ignore whitespace differences in product-name searches (for example, "چی توز" vs "چیتوز").
UPDATE "Product"
SET "nameNormalized" = regexp_replace("nameNormalized", '[[:space:]]+', '', 'g')
WHERE "nameNormalized" IS NOT NULL;

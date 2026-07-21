import { PrismaClient } from '@prisma/client';
import { normalizePersian } from '../../src/utils/persian-normalize';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, nameNormalized: true },
  });

  let updated = 0;
  for (const product of products) {
    const normalized = normalizePersian(product.name);
    if (product.nameNormalized !== normalized) {
      await prisma.product.update({
        where: { id: product.id },
        data: { nameNormalized: normalized },
      });
      updated += 1;
    }
  }

  console.log(`Normalized ${updated} of ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function lineTotal(singleUnitPrice: number, whole: number, partial: number, countPerUnit: number) {
  const count = Math.max(1, Number(countPerUnit) || 1);
  return Number(singleUnitPrice || 0) * (Math.max(0, whole) * count + Math.max(0, partial));
}

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      paidAmount: true,
      items: {
        select: { wholeQuantity: true, partialQuantity: true, countPerUnit: true, unitPrice: true },
      },
    },
  });

  let updated = 0;
  for (const order of orders) {
    const totalAmount = order.items.reduce(
      (sum, item) => sum + lineTotal(item.unitPrice, item.wholeQuantity, item.partialQuantity, item.countPerUnit),
      0,
    );
    const paidAmount = Number(order.paidAmount || 0);
    const paymentStatus = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    await prisma.order.update({
      where: { id: order.id },
      data: { totalAmount, paymentStatus },
    });
    updated += 1;
  }

  console.log(`Recalculated ${updated} order(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

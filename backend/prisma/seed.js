const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { phone: '09000000000' },
    update: {},
    create: {
      name: 'مدیر سیستم',
      phone: '09000000000',
      password: adminPass,
      role: 'ADMIN',
    },
  });

  const seller1Pass = await bcrypt.hash('seller123', 10);

  const seller1 = await prisma.user.upsert({
    where: { phone: '09111111111' },
    update: {},
    create: {
      name: 'فروشنده اول',
      phone: '09111111111',
      password: seller1Pass,
      role: 'SHOP_OWNER',
    },
  });

  const seller2Pass = await bcrypt.hash('seller456', 10);

  await prisma.user.upsert({
    where: { phone: '09222222222' },
    update: {},
    create: {
      name: 'فروشنده دوم',
      phone: '09222222222',
      password: seller2Pass,
      role: 'SHOP_OWNER',
    },
  });

  const visitorPass = await bcrypt.hash('visitor123', 10);

  const visitor = await prisma.user.upsert({
    where: { phone: '09333333333' },
    update: {},
    create: {
      name: 'ویزیتور نمونه',
      phone: '09333333333',
      password: visitorPass,
      role: 'VISITOR',
    },
  });

  const existingOrder = await prisma.order.findFirst({
    where: {
      sellerId: seller1.id,
      userId: visitor.id,
      notes: 'سفارش تست',
    },
  });

  if (!existingOrder) {
    await prisma.order.create({
      data: {
        sellerId: seller1.id,
        userId: visitor.id,
        notes: 'سفارش تست',
        items: {
          create: [],
        },
      },
    });
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ادمین
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

  // فروشنده 1
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

  // فروشنده 2
  const seller2Pass = await bcrypt.hash('seller456', 10);
  const seller2 = await prisma.user.upsert({
    where: { phone: '09222222222' },
    update: {},
    create: {
      name: 'فروشنده دوم',
      phone: '09222222222',
      password: seller2Pass,
      role: 'SHOP_OWNER',
    },
  });

  // ویزیتور
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

  // یک سفارش نمونه (ویزیتور برای فروشنده اول)
  await prisma.order.create({
    data: {
      sellerId: seller1.id,
      userId: visitor.id,
      notes: 'سفارش تست',
      items: {
        create: [] // در صورت وجود محصول می‌توانید اضافه کنید
      }
    }
  });

  console.log('✅ Seed completed!');
  console.log('Admin (ادمین):       09000000000 / admin123');
  console.log('Seller1 (فروشنده):   09111111111 / seller123');
  console.log('Seller2 (فروشنده):   09222222222 / seller456');
  console.log('Visitor (ویزیتور):   09333333333 / visitor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
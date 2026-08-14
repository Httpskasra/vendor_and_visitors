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

 
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
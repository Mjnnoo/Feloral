const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.productVariant.update({
    where: {
      id: 1,
    },
    data: {
      stock: 1000,
    },
    select: {
      id: true,
      sku: true,
      stock: true,
    },
  });

  console.log(updated);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
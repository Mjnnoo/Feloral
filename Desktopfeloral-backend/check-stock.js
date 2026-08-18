const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const variant = await prisma.productVariant.findUnique({
    where: {
      id: 1,
    },
    select: {
      id: true,
      sku: true,
      stock: true,
      isActive: true,
    },
  });

  console.log(variant);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
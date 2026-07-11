const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const NEW_PASSWORD = "Feloral@123456";

async function main() {
  const admin = await prisma.user.findFirst({
    where: {
      role: {
        in: ["super_admin", "admin"]
      }
    },
    select: {
      id: true,
      email: true,
      mobile: true,
      role: true
    }
  });

  if (!admin) {
    console.log("هیچ ادمین یا سوپرادمینی پیدا نشد");
    return;
  }

  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  await prisma.user.update({
    where: { id: admin.id },
    data: { password: hashedPassword }
  });

  console.log("ادمینی که پسوردش عوض شد:");
  console.table([admin]);
  console.log("پسورد جدید:", NEW_PASSWORD);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

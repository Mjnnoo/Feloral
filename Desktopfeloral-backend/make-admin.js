const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const ADMIN_MOBILE = "09121111111";
const ADMIN_PASSWORD = "12345678";

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: {
      mobile: ADMIN_MOBILE
    },
    update: {
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
      fullName: "Feloral Admin",
      email: "admin@feloral.ir"
    },
    create: {
      mobile: ADMIN_MOBILE,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
      fullName: "Feloral Admin",
      email: "admin@feloral.ir"
    },
    select: {
      id: true,
      fullName: true,
      mobile: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  console.log("ادمین آماده شد:");
  console.table([admin]);
  console.log("Login mobile:", ADMIN_MOBILE);
  console.log("Login password:", ADMIN_PASSWORD);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

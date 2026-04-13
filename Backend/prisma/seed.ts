import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('12345678', 10);

  await prisma.admin.upsert({
    where: { email: 'superadmin@stockapp.com' },
    update: {},
    create: {
      names: 'Super Admin',
      email: 'superadmin@stockapp.com',
      password,
      role: AdminRole.SUPER_ADMIN,
    },
  });

  await prisma.admin.upsert({
    where: { email: 'admin@stockapp.com' },
    update: {},
    create: {
      names: 'Admin User',
      email: 'admin@stockapp.com',
      password,
      role: AdminRole.ADMIN,
    },
  });

  await prisma.admin.upsert({
    where: { email: 'moderator@stockapp.com' },
    update: {},
    create: {
      names: 'Moderator User',
      email: 'moderator@stockapp.com',
      password,
      role: AdminRole.MODERATOR,
    },
  });

  console.log('✓ Seeded 3 admin users:');
  console.log('  superadmin@stockapp.com (SUPER_ADMIN) — password: 12345678');
  console.log('  admin@stockapp.com (ADMIN) — password: 12345678');
  console.log('  moderator@stockapp.com (MODERATOR) — password: 12345678');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

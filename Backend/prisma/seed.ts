import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('12345678', 10);

  // ── Admins ──────────────────────────────────────────────────────────────────

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

  // ── Permissions ─────────────────────────────────────────────────────────────

  const permissionDefs = [
    { name: 'stock_management',        description: 'Can view, add, and edit stock items' },
    { name: 'supplier_management',     description: 'Can manage suppliers and payments' },
    { name: 'category_management',     description: 'Can manage item categories' },
    { name: 'site_management',         description: 'Can manage sites, worker records, and expenses' },
    { name: 'requisition_management',  description: 'Can create, approve, and receive requisitions' },
    { name: 'record_direct_stock',     description: 'Can record items received at site without a prior requisition' },
  ];

  const permissions: Record<string, string> = {};
  for (const def of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { name: def.name },
      update: { description: def.description },
      create: def,
    });
    permissions[def.name] = perm.id;
  }

  // ── Employees ────────────────────────────────────────────────────────────────

  const employees = [
    {
      firstName: 'Alice',
      lastName: 'Mugisha',
      email: 'alice@stockapp.com',
      phone: '+250780000001',
      position: 'Warehouse Manager',
      perms: ['stock_management', 'category_management', 'supplier_management', 'record_direct_stock'],
    },
    {
      firstName: 'Bob',
      lastName: 'Nkurunziza',
      email: 'bob@stockapp.com',
      phone: '+250780000002',
      position: 'Site Supervisor',
      perms: ['site_management', 'requisition_management', 'record_direct_stock'],
    },
    {
      firstName: 'Claire',
      lastName: 'Uwimana',
      email: 'claire@stockapp.com',
      phone: '+250780000003',
      position: 'Procurement Officer',
      perms: ['requisition_management', 'supplier_management'],
    },
    {
      firstName: 'David',
      lastName: 'Habimana',
      email: 'david@stockapp.com',
      phone: '+250780000004',
      position: 'Stock Clerk',
      perms: ['stock_management', 'record_direct_stock'],
    },
    {
      firstName: 'Eve',
      lastName: 'Kayitesi',
      email: 'eve@stockapp.com',
      phone: '+250780000005',
      position: 'General Staff',
      perms: [],
    },
  ];

  for (const emp of employees) {
    const employee = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        password,
        phone: emp.phone,
        position: emp.position,
      },
    });

    // Assign permissions (skip if already assigned)
    for (const permName of emp.perms) {
      const permId = permissions[permName];
      if (!permId) continue;
      await prisma.employeePermission.upsert({
        where: { employeeId_permissionId: { employeeId: employee.id, permissionId: permId } },
        update: {},
        create: { employeeId: employee.id, permissionId: permId },
      });
    }
  }

  console.log('\n✓ Seeded admins:');
  console.log('  superadmin@stockapp.com (SUPER_ADMIN)');
  console.log('  admin@stockapp.com (ADMIN)');
  console.log('  moderator@stockapp.com (MODERATOR)');
  console.log('  → password for all: 12345678\n');

  console.log('✓ Seeded permissions:', permissionDefs.map(p => p.name).join(', '), '\n');

  console.log('✓ Seeded employees:');
  for (const emp of employees) {
    const permList = emp.perms.length ? emp.perms.join(', ') : '(no permissions)';
    console.log(`  ${emp.email} — ${emp.position}`);
    console.log(`    permissions: ${permList}`);
  }
  console.log('  → password for all: 12345678\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

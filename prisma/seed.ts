import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed Roles
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER', description: 'Regular user' },
  });

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'MODERATOR' },
    update: {},
    create: {
      name: 'MODERATOR',
      description: 'Moderator with moderation powers',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator with full access' },
  });

  // Seed Permissions
  const permissions = [
    { name: 'users:read', description: 'Read user information' },
    { name: 'users:write', description: 'Create/update users' },
    { name: 'users:delete', description: 'Delete users' },
    { name: 'roles:read', description: 'Read roles' },
    { name: 'roles:write', description: 'Create/update roles' },
    { name: 'admin:config', description: 'Access admin configuration' },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((perm) =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      }),
    ),
  );

  // Assign permissions to roles
  await prisma.role.update({
    where: { id: userRole.id },
    data: {
      permissions: {
        connect: [{ name: 'users:read' }, { name: 'roles:read' }],
      },
    },
  });

  await prisma.role.update({
    where: { id: moderatorRole.id },
    data: {
      permissions: {
        connect: [
          { name: 'users:read' },
          { name: 'users:write' },
          { name: 'roles:read' },
        ],
      },
    },
  });

  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        connect: createdPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  console.log('Seed completed: 3 roles + 6 permissions');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

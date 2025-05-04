// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MANAGEABLE_PATHS } from '../src/lib/constants'; // Adjust path if needed

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('Start seeding...');

  // Check if any user already exists
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    console.log('No users found, seeding initial admin user...');
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'Admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Password123';

    if (adminPassword.length < 6) {
      console.error('Initial admin password must be at least 6 characters long. Seeding aborted.');
      return;
    }

    const adminPasswordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const adminPermissions = MANAGEABLE_PATHS.map(p => p.path);

    try {
      const adminUser = await prisma.user.create({
        data: {
          username: adminUsername,
          passwordHash: adminPasswordHash,
          role: Role.superadmin, // Use the enum from Prisma Client
          permissions: adminPermissions, // Prisma handles JSON serialization
        },
      });
      console.log(`Admin user '${adminUser.username}' created successfully.`);
    } catch (error) {
        if (error instanceof Error && (error as any).code === 'P2002' && (error as any).meta?.target?.includes('username')) {
            console.warn(`Admin user '${adminUsername}' already exists. Skipping creation.`);
        } else {
            console.error('Error seeding admin user:', error);
            throw error; // Re-throw other errors
        }
    }
  } else {
    console.log('Users already exist in the database. Skipping initial admin seed.');
  }

  // You can add seeding for other data (e.g., default categories) here if needed

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  });

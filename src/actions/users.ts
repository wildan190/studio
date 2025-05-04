'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db'; // Import Prisma client instance
import type { User, Role as AppRole } from '@/types'; // Use application-defined types
import { Role as PrismaRole } from '@prisma/client'; // Use Prisma-generated enum for DB operations
import { MANAGEABLE_PATHS, DEFAULT_ALLOWED_PATHS } from '@/lib/constants';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// --- Schemas ---
// Application-level User type (consider moving Role enum here or importing consistently)
const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  passwordHash: z.string().optional(), // Hash is internal, not always exposed
  role: z.nativeEnum(PrismaRole), // Use Prisma enum for validation
  permissions: z.array(z.string()),
});

const AddUserInputSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(PrismaRole, { required_error: 'Role is required' }),
});
type AddUserInput = z.infer<typeof AddUserInputSchema>;

const UpdateUserInputSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.nativeEnum(PrismaRole).optional(),
});
type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

const UpdatePermissionsInputSchema = z.object({
  permissions: z.array(z.string()),
});

// --- Helper Functions ---
// Map Prisma User to Application User Type (excluding hash by default)
const mapPrismaUserToAppUser = (prismaUser: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>): User => ({
    id: prismaUser.id,
    username: prismaUser.username,
    // passwordHash: prismaUser.passwordHash, // Don't expose hash by default
    role: prismaUser.role as AppRole, // Cast to AppRole if needed, ensure enums align
    permissions: prismaUser.permissions as string[], // Assuming permissions are stored as JSON string array
});

const mapPrismaUserToAppUserWithHash = (prismaUser: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>): User & { passwordHash: string } => ({
    id: prismaUser.id,
    username: prismaUser.username,
    passwordHash: prismaUser.passwordHash, // Include hash for auth purposes
    role: prismaUser.role as AppRole,
    permissions: prismaUser.permissions as string[],
});

// --- Server Actions ---

export async function getUsersAction(): Promise<User[]> {
  // TODO: Add superadmin authentication check
  try {
    const users = await prisma.user.findMany({
      orderBy: { username: 'asc' },
      // Select specific fields to exclude password hash
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
      }
    });
    // Map Prisma User to Application User Type
    return users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role as AppRole,
        permissions: u.permissions as string[]
    }));
  } catch (error) {
    console.error('Error fetching users with Prisma:', error);
    throw new Error('Failed to fetch users.');
  }
}

export async function getUserForAuthAction(username: string): Promise<(User & { passwordHash: string }) | null> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        // Prisma typically handles case-insensitivity at the DB level if configured,
        // otherwise, ensure your DB collation is case-insensitive or adjust query.
        // For Prisma with default setup, direct unique find is case-sensitive.
        // If case-insensitivity is needed here:
        // username: { equals: username, mode: 'insensitive' } // Requires Prisma feature/DB setup
        // Or fetch and filter:
         username: username // Assuming DB collation handles it or exact match is intended
         // If truly needing case-insensitive lookup on a case-sensitive DB:
         // Consider querying with `findFirst` and a `where` clause using `mode: 'insensitive'`
         // or fetching all and filtering in application (less efficient).
         // Example using findFirst:
         // const user = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });

      },
    });
    if (!user) {
      return null;
    }
    // Map including password hash
     return mapPrismaUserToAppUserWithHash(user);
  } catch (error) {
    console.error('Error fetching user for auth with Prisma:', error);
    throw new Error('Failed to fetch user.');
  }
}


export async function addUserAction(data: AddUserInput): Promise<Omit<User, 'passwordHash'>> {
 // TODO: Add superadmin authentication check
 const validation = AddUserInputSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(`Invalid user data: ${validation.error.errors.map(e => e.message).join(', ')}`);
  }
  const { username, password, role } = validation.data;

  try {
    // Check if username already exists (case-insensitive check is better here)
    const existingUser = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } }
    });
    if (existingUser) {
      throw new Error('Username already exists.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const defaultPermissions = role === PrismaRole.superadmin
        ? MANAGEABLE_PATHS.map(p => p.path)
        : DEFAULT_ALLOWED_PATHS;

    const newUser = await prisma.user.create({
      data: {
        username: username,
        passwordHash: passwordHash,
        role: role,
        permissions: defaultPermissions, // Prisma handles JSON conversion
      },
       select: { // Select fields to return (exclude hash)
         id: true,
         username: true,
         role: true,
         permissions: true,
       }
    });

    revalidatePath('/users');
    // Map the returned Prisma user (without hash) to the application User type
    return {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role as AppRole,
        permissions: newUser.permissions as string[],
    };

  } catch (error: any) {
    console.error('Error adding user with Prisma:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        // Handle Prisma's unique constraint violation code
        throw new Error('Username already exists.');
    }
     if (error instanceof Error && error.message === 'Username already exists.') {
        throw error; // Re-throw specific known errors
    }
    throw new Error('Failed to add user.');
  }
}

export async function updateUserAction(id: string, data: UpdateUserInput): Promise<void> {
  // TODO: Add superadmin authentication check
  const validation = UpdateUserInputSchema.safeParse(data);
    if (!validation.success) {
        throw new Error(`Invalid update data: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }
    const { username, password, role } = validation.data;

    if (!username && !password && !role) {
        throw new Error("No update data provided.");
    }

  try {
        // Check if user exists
        const currentUserData = await prisma.user.findUnique({
            where: { id },
            select: { username: true, role: true }
        });
        if (!currentUserData) {
            throw new Error('User not found.');
        }

       // Check for username conflict if username is changing
       if (username && username.toLowerCase() !== currentUserData.username.toLowerCase()) {
           const existingUser = await prisma.user.findFirst({
                where: {
                    username: { equals: username, mode: 'insensitive' },
                    id: { not: id } // Exclude the current user
                }
           });
           if (existingUser) {
               throw new Error('Username already exists.');
           }
       }

    const updateData: Partial<Awaited<ReturnType<typeof prisma.user.update>>['data']> = {}; // Use Prisma type for update data

    if (username) {
      updateData.username = username;
    }

    if (password) {
        updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (role) {
        updateData.role = role;
         // If role changes, reset permissions accordingly
        updateData.permissions = role === PrismaRole.superadmin
                ? MANAGEABLE_PATHS.map(p => p.path)
                : DEFAULT_ALLOWED_PATHS;
    }

    // Add updatedAt manually if not automatically handled by @updatedAt (depends on Prisma version/setup)
     updateData.updatedAt = new Date(); // Ensure updated_at is set

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/users');
  } catch (error: any) {
    console.error('Error updating user with Prisma:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        throw new Error('Username already exists.');
    }
    if (error.code === 'P2025') { // Record to update not found
         throw new Error('User not found.');
    }
     if (error instanceof Error && (error.message === 'User not found.' || error.message === 'Username already exists.')) {
        throw error; // Re-throw specific known errors
    }
    throw new Error('Failed to update user.');
  }
}

export async function deleteUserAction(id: string, currentUserId: string): Promise<void> {
  // TODO: Add superadmin authentication check
    if (id === currentUserId) {
        throw new Error('Cannot delete your own account.');
    }

  try {
        // Check if the user to delete exists and get their role
         const userToDelete = await prisma.user.findUnique({
             where: { id },
             select: { role: true }
         });
         if (!userToDelete) {
             throw new Error('User not found.');
         }

         // Prevent deleting the last superadmin
         if (userToDelete.role === PrismaRole.superadmin) {
             const superadminCount = await prisma.user.count({ where: { role: PrismaRole.superadmin } });
             if (superadminCount <= 1) {
                 throw new Error('Cannot delete the last superadmin.');
             }
         }

    await prisma.user.delete({
        where: { id }
    });

    revalidatePath('/users');
  } catch (error: any) {
    console.error('Error deleting user with Prisma:', error);
     if (error.code === 'P2025') { // Record to delete not found
         throw new Error('User not found.');
     }
    if (error instanceof Error && (error.message === 'User not found.' || error.message === 'Cannot delete your own account.' || error.message === 'Cannot delete the last superadmin.')) {
        throw error; // Re-throw specific known errors
    }
    throw new Error('Failed to delete user.');
  }
}

export async function updateUserPermissionsAction(userId: string, permissions: string[]): Promise<void> {
   // TODO: Add superadmin authentication check
    const validation = UpdatePermissionsInputSchema.safeParse({ permissions });
    if (!validation.success) {
        throw new Error(`Invalid permissions data: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }

    try {
        // Fetch the user's current role to ensure superadmin permissions aren't overridden
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
         if (!user) {
            throw new Error('User not found.');
        }

         // Superadmins always have all permissions defined in constants
         const finalPermissions = user.role === PrismaRole.superadmin
            ? MANAGEABLE_PATHS.map(p => p.path)
            : validation.data.permissions;

        await prisma.user.update({
            where: { id: userId },
            data: {
                permissions: finalPermissions, // Prisma handles JSON
                updatedAt: new Date() // Ensure updated_at is set
            }
        });
        revalidatePath('/users');
    } catch (error: any) {
        console.error('Error updating user permissions with Prisma:', error);
        if (error.code === 'P2025') { // Record to update not found
             throw new Error('User not found.');
        }
         if (error instanceof Error && error.message === 'User not found.') {
            throw error; // Re-throw specific known errors
        }
        throw new Error('Failed to update permissions.');
    }
}

// Remove initializeUsersTable function - Prisma handles schema management

export async function verifyPassword(passwordAttempt: string, storedHash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(passwordAttempt, storedHash);
    } catch (error) {
        console.error("Error comparing password:", error);
        return false;
    }
}

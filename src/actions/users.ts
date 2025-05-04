'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { pool } from '@/lib/db';
import type { User, Role } from '@/types';
import { MANAGEABLE_PATHS, DEFAULT_ALLOWED_PATHS } from '@/lib/constants';
import * as bcrypt from 'bcrypt'; // Use bcrypt for password hashing

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// --- Schemas ---

const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  password_hash: z.string(), // Store hash, not plaintext
  role: z.enum(['superadmin', 'user']),
  permissions: z.array(z.string()), // Array of allowed paths
});

// Schema for adding a user
const AddUserInputSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['superadmin', 'user'], { required_error: 'Role is required' }),
});
type AddUserInput = z.infer<typeof AddUserInputSchema>;

// Schema for updating a user
const UpdateUserInputSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['superadmin', 'user']).optional(),
});
type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

// Schema for updating permissions
const UpdatePermissionsInputSchema = z.object({
  permissions: z.array(z.string()),
});


// --- Helper Functions ---

const mapRowToUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password_hash, // Keep the hash name consistent internally if needed, but map to User type
  role: row.role,
  permissions: row.permissions || [], // Handle potential null from DB
});


// --- Server Actions ---

/**
 * Fetches all users, ordered by username.
 * Should only be callable by superadmins.
 * @returns A promise that resolves to an array of users.
 */
export async function getUsersAction(): Promise<User[]> {
  // TODO: Add authentication check here to ensure only superadmin calls this
  const client = await pool.connect();
  try {
    // Exclude password_hash from the general fetch for security
    const result = await client.query(
      'SELECT id, username, role, permissions FROM users ORDER BY username'
    );
    return result.rows.map(mapRowToUser);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users.');
  } finally {
    client.release();
  }
}

/**
 * Fetches a single user by username for authentication.
 * Includes the password hash.
 * @param username The username to fetch.
 * @returns A promise that resolves to the user or null if not found.
 */
export async function getUserForAuthAction(username: string): Promise<User | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, password_hash, role, permissions FROM users WHERE lower(username) = lower($1)',
      [username]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToUser(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user for auth:', error);
    throw new Error('Failed to fetch user.');
  } finally {
    client.release();
  }
}


/**
 * Adds a new user.
 * Should only be callable by superadmins.
 * @param data The user data.
 * @returns A promise that resolves to the newly created user (without password hash) or throws an error.
 */
export async function addUserAction(data: AddUserInput): Promise<Omit<User, 'passwordHash'>> {
 // TODO: Add authentication check here to ensure only superadmin calls this
 const validation = AddUserInputSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(`Invalid user data: ${validation.error.errors.map(e => e.message).join(', ')}`);
  }
  const { username, password, role } = validation.data;

  const client = await pool.connect();
  try {
    // Check if username already exists (case-insensitive)
    const existingUser = await client.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
    if (existingUser.rows.length > 0) {
      throw new Error('Username already exists.');
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Determine default permissions
    const defaultPermissions = role === 'superadmin'
        ? MANAGEABLE_PATHS.map(p => p.path)
        : DEFAULT_ALLOWED_PATHS;

    // Insert the new user
    const result = await client.query(
      'INSERT INTO users (username, password_hash, role, permissions) VALUES ($1, $2, $3, $4) RETURNING id, username, role, permissions',
      [username, passwordHash, role, JSON.stringify(defaultPermissions)] // Store permissions as JSONB array
    );

    const newUser = mapRowToUser(result.rows[0]);
    revalidatePath('/users'); // Revalidate the users page cache
    // Return user data without the hash
    const { passwordHash: _, ...userToReturn } = newUser;
    return userToReturn;

  } catch (error) {
    console.error('Error adding user:', error);
    if (error instanceof Error && error.message === 'Username already exists.') {
        throw error; // Re-throw specific known errors
    }
    throw new Error('Failed to add user.');
  } finally {
    client.release();
  }
}


/**
 * Updates an existing user.
 * Should only be callable by superadmins.
 * @param id The ID of the user to update.
 * @param data The data to update (username, password, role).
 * @returns A promise that resolves when the update is complete or throws an error.
 */
export async function updateUserAction(id: string, data: UpdateUserInput): Promise<void> {
  // TODO: Add authentication check here to ensure only superadmin calls this
  const validation = UpdateUserInputSchema.safeParse(data);
    if (!validation.success) {
        throw new Error(`Invalid update data: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }
    const { username, password, role } = validation.data;

    if (!username && !password && !role) {
        throw new Error("No update data provided.");
    }

  const client = await pool.connect();
  try {
        // Check if user exists
        const currentUserData = await client.query('SELECT username, role FROM users WHERE id = $1', [id]);
        if (currentUserData.rows.length === 0) {
            throw new Error('User not found.');
        }
        const currentUsername = currentUserData.rows[0].username;
        const currentRole = currentUserData.rows[0].role;


       // Check for username conflict if username is changing
       if (username && username.toLowerCase() !== currentUsername.toLowerCase()) {
           const existingUser = await client.query('SELECT id FROM users WHERE lower(username) = lower($1) AND id != $2', [username, id]);
           if (existingUser.rows.length > 0) {
               throw new Error('Username already exists.');
           }
       }


    const updates: string[] = [];
    const values: any[] = [id];
    let valueIndex = 2; // Start indexing from $2

    if (username) {
      updates.push(`username = $${valueIndex++}`);
      values.push(username);
    }

    if (password) {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        updates.push(`password_hash = $${valueIndex++}`);
        values.push(passwordHash);
    }

    if (role) {
        updates.push(`role = $${valueIndex++}`);
        values.push(role);

         // If role changes, reset permissions accordingly
        const newPermissions = role === 'superadmin'
                ? MANAGEABLE_PATHS.map(p => p.path)
                : DEFAULT_ALLOWED_PATHS; // Reset to default for 'user' role
        updates.push(`permissions = $${valueIndex++}`);
        values.push(JSON.stringify(newPermissions)); // Store permissions as JSON array
    }

    updates.push(`updated_at = NOW()`); // Always update updated_at timestamp

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $1`;

    await client.query(updateQuery, values);

    revalidatePath('/users'); // Revalidate the users page cache
  } catch (error) {
    console.error('Error updating user:', error);
     if (error instanceof Error && (error.message === 'User not found.' || error.message === 'Username already exists.')) {
        throw error; // Re-throw specific known errors
    }
    throw new Error('Failed to update user.');
  } finally {
    client.release();
  }
}


/**
 * Deletes a user by ID.
 * Should only be callable by superadmins.
 * @param id The ID of the user to delete.
 * @param currentUserId The ID of the user performing the action (to prevent self-deletion and last admin deletion).
 * @returns A promise that resolves when the deletion is complete or throws an error.
 */
export async function deleteUserAction(id: string, currentUserId: string): Promise<void> {
  // TODO: Add authentication check here to ensure only superadmin calls this
    if (id === currentUserId) {
        throw new Error('Cannot delete your own account.');
    }

  const client = await pool.connect();
  try {
        // Check if the user to delete exists and is superadmin
         const userToDeleteResult = await client.query('SELECT role FROM users WHERE id = $1', [id]);
         if (userToDeleteResult.rows.length === 0) {
             throw new Error('User not found.');
         }
         const userToDeleteRole = userToDeleteResult.rows[0].role;

         // Prevent deleting the last superadmin
         if (userToDeleteRole === 'superadmin') {
             const superadminCountResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'superadmin'");
             if (parseInt(superadminCountResult.rows[0].count, 10) <= 1) {
                 throw new Error('Cannot delete the last superadmin.');
             }
         }

    const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
    );

    if (result.rowCount === 0) {
        // Should have been caught by the check above, but good safeguard
        throw new Error('User not found.');
    }

    revalidatePath('/users'); // Revalidate the users page cache
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && (error.message === 'User not found.' || error.message === 'Cannot delete your own account.' || error.message === 'Cannot delete the last superadmin.')) {
        throw error; // Re-throw specific known errors
    }
    throw new Error('Failed to delete user.');
  } finally {
    client.release();
  }
}

/**
 * Updates the permissions for a specific user.
 * Should only be callable by superadmins.
 * @param userId The ID of the user whose permissions to update.
 * @param permissions An array of allowed route paths.
 * @returns A promise that resolves when the update is complete or throws an error.
 */
export async function updateUserPermissionsAction(userId: string, permissions: string[]): Promise<void> {
   // TODO: Add authentication check here to ensure only superadmin calls this
    const validation = UpdatePermissionsInputSchema.safeParse({ permissions });
    if (!validation.success) {
        throw new Error(`Invalid permissions data: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }

    const client = await pool.connect();
    try {
        // Fetch the user's current role to ensure superadmin permissions aren't overridden
        const userResult = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
         if (userResult.rows.length === 0) {
            throw new Error('User not found.');
        }
        const userRole = userResult.rows[0].role;

         // Superadmins always have all permissions defined in constants
         const finalPermissions = userRole === 'superadmin'
            ? MANAGEABLE_PATHS.map(p => p.path)
            : validation.data.permissions;

        await client.query(
            'UPDATE users SET permissions = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(finalPermissions), userId] // Store permissions as JSON array
        );
        revalidatePath('/users'); // Revalidate the users page cache
    } catch (error) {
        console.error('Error updating user permissions:', error);
         if (error instanceof Error && error.message === 'User not found.') {
            throw error; // Re-throw specific known errors
        }
        throw new Error('Failed to update permissions.');
    } finally {
        client.release();
    }
}


// --- Database Initialization (Run once, e.g., in a migration script) ---
/*
 * This is an example of how you might initialize the table.
 * In a real application, use a proper migration tool (e.g., node-pg-migrate).
 */
export async function initializeUsersTable(): Promise<void> {
  const client = await pool.connect();
  try {
    // Enable pgcrypto extension if not already enabled (for gen_random_uuid())
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'user')),
        permissions JSONB DEFAULT '[]', -- Store permissions as a JSON array
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Index on lowercase username for case-insensitive lookup
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users (lower(username));');
    console.log('Users table initialized successfully.');

    // Seed initial admin user if table is empty
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count, 10) === 0) {
        console.log('Seeding initial admin user...');
        const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "Admin";
        const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "Password123"; // Use env vars
        if (adminPassword.length < 6) {
            throw new Error("Initial admin password must be at least 6 characters long.");
        }
        const adminPasswordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
        const adminPermissions = MANAGEABLE_PATHS.map(p => p.path);

        await client.query(
            'INSERT INTO users (username, password_hash, role, permissions) VALUES ($1, $2, $3, $4)',
            [adminUsername, adminPasswordHash, 'superadmin', JSON.stringify(adminPermissions)]
        );
        console.log(`Admin user '${adminUsername}' seeded successfully.`);
    }

  } catch (error) {
    console.error('Error initializing users table:', error);
    throw new Error('Failed to initialize database tables.');
  } finally {
    client.release();
  }
}

// --- Authentication Helper ---
/**
 * Verifies a user's password against the stored hash.
 * @param passwordAttempt The password attempt from the user.
 * @param storedHash The hash stored in the database.
 * @returns A promise that resolves to true if the password is valid, false otherwise.
 */
export async function verifyPassword(passwordAttempt: string, storedHash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(passwordAttempt, storedHash);
    } catch (error) {
        console.error("Error comparing password:", error);
        return false; // Treat comparison errors as invalid password
    }
}

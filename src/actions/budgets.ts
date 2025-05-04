'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { pool } from '@/lib/db';
import type { Budget, BudgetPeriod } from '@/types';

// --- Schemas ---

const BudgetSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  amount: z.number(),
  period: z.enum(['monthly', 'yearly']),
  user_id: z.string().uuid(), // Foreign key to users table
});

const AddBudgetInputSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Budget amount must be positive'),
  period: z.enum(['monthly', 'yearly'], { required_error: 'Period is required' }),
  userId: z.string().uuid('User ID is required'),
});
type AddBudgetInput = z.infer<typeof AddBudgetInputSchema>;


// --- Helper Functions ---

const mapRowToBudget = (row: any): Budget => ({
    id: row.id,
    category: row.category,
    amount: parseFloat(row.amount), // Ensure amount is a number
    period: row.period,
});

// --- Server Actions ---

/**
 * Fetches budgets for a specific user, ordered by category.
 * @param userId The ID of the user whose budgets to fetch.
 * @returns A promise that resolves to an array of budgets.
 */
export async function getBudgetsAction(userId: string): Promise<Budget[]> {
  if (!userId) {
    console.error('getBudgetsAction: userId is required');
    return [];
  }
  const client = await pool.connect();
  try {
    const result = await client.query<Budget>(
      'SELECT id, category, amount, period FROM budgets WHERE user_id = $1 ORDER BY category',
      [userId]
    );
    return result.rows.map(mapRowToBudget);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    throw new Error('Failed to fetch budgets.');
  } finally {
    client.release();
  }
}

/**
 * Adds a new budget or updates an existing one for a specific user based on category and period.
 * Uses UPSERT functionality.
 * @param data The budget data including the userId.
 * @returns A promise that resolves to the created or updated budget or throws an error.
 */
export async function addOrUpdateBudgetAction(data: AddBudgetInput): Promise<Budget> {
  const validation = AddBudgetInputSchema.safeParse(data);
   if (!validation.success) {
     console.error('addOrUpdateBudgetAction validation failed:', validation.error.errors);
     throw new Error(`Invalid budget data: ${validation.error.errors.map(e => e.message).join(', ')}`);
   }
  const { category, amount, period, userId } = validation.data;
  const client = await pool.connect();

  try {
    // UPSERT: Insert or update based on unique constraint (user_id, lower(category), period)
    const result = await client.query(
      `INSERT INTO budgets (user_id, category, amount, period)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, lower_category, period)
       DO UPDATE SET amount = EXCLUDED.amount, category = EXCLUDED.category, updated_at = NOW()
       RETURNING id, category, amount, period`,
      [userId, category, amount, period]
    );

    const upsertedBudget = mapRowToBudget(result.rows[0]);
    revalidatePath('/budgets'); // Revalidate the budgets page cache
    revalidatePath('/'); // Revalidate dashboard if it shows budget info
    revalidatePath('/reports'); // Revalidate reports page
    return upsertedBudget;
  } catch (error) {
    console.error('Error adding or updating budget:', error);
    throw new Error('Failed to save budget.');
  } finally {
    client.release();
  }
}

/**
 * Deletes a budget by its ID and user ID.
 * @param id The ID of the budget to delete.
 * @param userId The ID of the user who owns the budget (for security).
 * @returns A promise that resolves when the deletion is complete or throws an error.
 */
export async function deleteBudgetAction(id: string, userId: string): Promise<void> {
   if (!id || !userId) {
        console.error('deleteBudgetAction: Both id and userId are required.');
        throw new Error('Budget ID and User ID are required.');
    }
  const client = await pool.connect();
  try {
     const result = await client.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id', // Verify user ownership
      [id, userId]
    );

    if (result.rowCount === 0) {
        throw new Error('Budget not found or user does not have permission to delete.');
    }

    revalidatePath('/budgets'); // Revalidate the budgets page cache
    revalidatePath('/'); // Revalidate dashboard if it shows budget info
    revalidatePath('/reports'); // Revalidate reports page
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw new Error('Failed to delete budget.');
  } finally {
    client.release();
  }
}


// --- Database Initialization (Run once, e.g., in a migration script) ---
/*
 * This is an example of how you might initialize the table.
 * In a real application, use a proper migration tool (e.g., node-pg-migrate).
 */
export async function initializeBudgetsTable(): Promise<void> {
  const client = await pool.connect();
  try {
     // Add the lower_category column first if it doesn't exist
     try {
        await client.query('ALTER TABLE budgets ADD COLUMN lower_category TEXT;');
        console.log("Column 'lower_category' added successfully.");
      } catch (alterError: any) {
        // Ignore error if the column already exists (error code 42701 for duplicate column)
        if (alterError.code !== '42701') {
          throw alterError; // Re-throw other errors
        }
        console.log("Column 'lower_category' already exists.");
      }

       // Populate the lower_category column for existing rows
        await client.query('UPDATE budgets SET lower_category = lower(category) WHERE lower_category IS NULL;');
        console.log("Populated 'lower_category' for existing rows.");


     // Now create the main table structure
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
        period VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'yearly')),
        lower_category TEXT GENERATED ALWAYS AS (lower(category)) STORED, -- Generated column for case-insensitive check
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
        -- Removed UNIQUE constraint here, will add below
      );
    `);

      // Add the unique constraint separately to handle potential pre-existence
      try {
            await client.query('ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_period_unique UNIQUE (user_id, lower_category, period);');
            console.log("Unique constraint 'budgets_user_category_period_unique' added successfully.");
      } catch (constraintError: any) {
            // Ignore error if constraint already exists (error code 42P07 for duplicate table/constraint)
           if (constraintError.code !== '42P07') {
                console.error('Error adding unique constraint:', constraintError)
                 // If constraint fails due to duplicate data, you might need manual cleanup
                if(constraintError.code === '23505') { // unique_violation
                    console.error("Duplicate budget entries found. Please clean up data manually before applying the constraint.")
                }
               // throw constraintError; // Re-throw other errors
           } else {
                console.log("Unique constraint 'budgets_user_category_period_unique' already exists.");
            }
      }


    await client.query('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);');
    console.log('Budgets table initialized successfully.');
  } catch (error) {
    console.error('Error initializing budgets table:', error);
    throw new Error('Failed to initialize database tables.');
  } finally {
    client.release();
  }
}
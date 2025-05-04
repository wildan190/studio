'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { pool } from '@/lib/db';
import type { Transaction, TransactionType } from '@/types';

// --- Schemas ---

const TransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  description: z.string(),
  amount: z.number(),
  date: z.date(),
  user_id: z.string().uuid(), // Foreign key to users table
});

const AddTransactionInputSchema = z.object({
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.date({ required_error: 'Date is required' }),
  userId: z.string().uuid('User ID is required'),
});
type AddTransactionInput = z.infer<typeof AddTransactionInputSchema>;

// --- Helper Functions ---

const mapRowToTransaction = (row: any): Transaction => ({
  id: row.id,
  type: row.type,
  description: row.description,
  amount: parseFloat(row.amount), // Ensure amount is a number
  date: new Date(row.date),
});


// --- Server Actions ---

/**
 * Fetches transactions for a specific user, ordered by date descending.
 * @param userId The ID of the user whose transactions to fetch.
 * @returns A promise that resolves to an array of transactions.
 */
export async function getTransactionsAction(userId: string): Promise<Transaction[]> {
  if (!userId) {
    console.error('getTransactionsAction: userId is required');
    return [];
  }
  const client = await pool.connect();
  try {
    const result = await client.query<Transaction>(
      'SELECT id, type, description, amount, date FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    // Ensure date objects are correctly parsed (pg might return strings)
    return result.rows.map(mapRowToTransaction);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Consider throwing a more specific error or returning an error object
    throw new Error('Failed to fetch transactions.');
  } finally {
    client.release();
  }
}

/**
 * Adds a new transaction for a specific user.
 * @param data The transaction data including the userId.
 * @returns A promise that resolves to the newly created transaction or throws an error.
 */
export async function addTransactionAction(data: AddTransactionInput): Promise<Transaction> {
   const validation = AddTransactionInputSchema.safeParse(data);
   if (!validation.success) {
     console.error('addTransactionAction validation failed:', validation.error.errors);
     throw new Error(`Invalid transaction data: ${validation.error.errors.map(e => e.message).join(', ')}`);
   }

  const { type, description, amount, date, userId } = validation.data;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO transactions (type, description, amount, date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, description, amount, date',
      [type, description, amount, date, userId]
    );
    const newTransaction = mapRowToTransaction(result.rows[0]);
    revalidatePath('/transactions'); // Revalidate the transactions page cache
    revalidatePath('/'); // Revalidate dashboard if it shows transactions
    revalidatePath('/reports'); // Revalidate reports page
    return newTransaction;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw new Error('Failed to add transaction.');
  } finally {
    client.release();
  }
}

/**
 * Deletes a transaction by its ID and user ID.
 * @param id The ID of the transaction to delete.
 * @param userId The ID of the user who owns the transaction (for security).
 * @returns A promise that resolves when the deletion is complete or throws an error.
 */
export async function deleteTransactionAction(id: string, userId: string): Promise<void> {
   if (!id || !userId) {
        console.error('deleteTransactionAction: Both id and userId are required.');
        throw new Error('Transaction ID and User ID are required.');
    }
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id', // Verify user ownership
      [id, userId]
    );

    if (result.rowCount === 0) {
        throw new Error('Transaction not found or user does not have permission to delete.');
    }

    revalidatePath('/transactions'); // Revalidate the transactions page cache
    revalidatePath('/'); // Revalidate dashboard if it shows transactions
    revalidatePath('/reports'); // Revalidate reports page
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('Failed to delete transaction.');
  } finally {
    client.release();
  }
}

// --- Database Initialization (Run once, e.g., in a migration script) ---
/*
 * This is an example of how you might initialize the table.
 * In a real application, use a proper migration tool (e.g., node-pg-migrate).
 */
export async function initializeTransactionsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        description TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0), -- Example precision
        date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
     await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);');
     await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);');
     console.log('Transactions table initialized successfully.');
  } catch (error) {
    console.error('Error initializing transactions table:', error);
    throw new Error('Failed to initialize database tables.');
  } finally {
    client.release();
  }
}

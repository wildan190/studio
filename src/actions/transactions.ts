'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db'; // Import Prisma client instance
import type { Transaction, TransactionType as AppTransactionType } from '@/types';
import { TransactionType as PrismaTransactionType } from '@prisma/client';

// --- Schemas ---

const TransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(PrismaTransactionType), // Use Prisma enum
  description: z.string(),
  amount: z.number(), // Prisma returns number for Decimal/Float
  date: z.date(),
  userId: z.string().uuid(), // Renamed from user_id for consistency
});

const AddTransactionInputSchema = z.object({
  type: z.nativeEnum(PrismaTransactionType),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.date({ required_error: 'Date is required' }),
  userId: z.string().uuid('User ID is required'),
});
type AddTransactionInput = z.infer<typeof AddTransactionInputSchema>;

// --- Helper Functions ---

// Map Prisma Transaction to Application Transaction Type
const mapPrismaTransactionToApp = (prismaTransaction: NonNullable<Awaited<ReturnType<typeof prisma.transaction.findUnique>>>): Transaction => ({
  id: prismaTransaction.id,
  type: prismaTransaction.type as AppTransactionType, // Cast to AppTransactionType
  description: prismaTransaction.description,
  amount: prismaTransaction.amount, // Prisma Decimal is number; ensure compatibility if needed
  date: new Date(prismaTransaction.date), // Ensure date is a Date object
});

// --- Server Actions ---

export async function getTransactionsAction(userId: string): Promise<Transaction[]> {
  if (!userId) {
    console.error('getTransactionsAction: userId is required');
    return [];
  }
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: userId },
      orderBy: { date: 'desc' },
    });
    // Map Prisma results to Application Transaction type
    return transactions.map(mapPrismaTransactionToApp);
  } catch (error) {
    console.error('Error fetching transactions with Prisma:', error);
    throw new Error('Failed to fetch transactions.');
  }
}

export async function addTransactionAction(data: AddTransactionInput): Promise<Transaction> {
   const validation = AddTransactionInputSchema.safeParse(data);
   if (!validation.success) {
     console.error('addTransactionAction validation failed:', validation.error.errors);
     throw new Error(`Invalid transaction data: ${validation.error.errors.map(e => e.message).join(', ')}`);
   }

  const { type, description, amount, date, userId } = validation.data;

  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        userId: userId,
        type: type,
        description: description,
        amount: amount,
        date: date, // Prisma expects Date object
      },
    });
    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/reports');
    return mapPrismaTransactionToApp(newTransaction);
  } catch (error) {
    console.error('Error adding transaction with Prisma:', error);
    throw new Error('Failed to add transaction.');
  }
}

export async function deleteTransactionAction(id: string, userId: string): Promise<void> {
   if (!id || !userId) {
        console.error('deleteTransactionAction: Both id and userId are required.');
        throw new Error('Transaction ID and User ID are required.');
    }

  try {
    // Verify user ownership before deleting
    const transaction = await prisma.transaction.findUnique({
        where: { id: id }
    });

    if (!transaction) {
        throw new Error('Transaction not found.');
    }
    if (transaction.userId !== userId) {
         throw new Error('User does not have permission to delete this transaction.');
    }

    await prisma.transaction.delete({
      where: { id: id },
      // No need to check userId here again as we did it above
    });

    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/reports');
  } catch (error: any) {
    console.error('Error deleting transaction with Prisma:', error);
     if (error.code === 'P2025') { // Record to delete not found
         // This might happen in a race condition, treat as success or specific error
         console.warn(`Transaction with ID ${id} not found for deletion (P2025).`);
         // Depending on desired behavior, you might not throw here
         // throw new Error('Transaction not found.');
     } else if (error instanceof Error && (error.message.includes('not found') || error.message.includes('permission'))) {
         throw error; // Re-throw specific known errors
     } else {
        throw new Error('Failed to delete transaction.');
    }
  }
}

// Remove initializeTransactionsTable function - Prisma handles schema management

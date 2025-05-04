'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db'; // Import Prisma client instance
import type { Budget, BudgetPeriod as AppBudgetPeriod } from '@/types';
import { BudgetPeriod as PrismaBudgetPeriod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal

// --- Schemas ---

// Prisma returns Decimal type, which needs conversion for client-side (usually to number)
const BudgetSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  amount: z.instanceof(Decimal), // Expect Prisma Decimal type
  period: z.nativeEnum(PrismaBudgetPeriod), // Use Prisma enum
  userId: z.string().uuid(), // Renamed from user_id
});

const AddBudgetInputSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  // Use number for input coercion, Prisma handles conversion to Decimal
  amount: z.coerce.number().positive('Budget amount must be positive'),
  period: z.nativeEnum(PrismaBudgetPeriod, { required_error: 'Period is required' }),
  userId: z.string().uuid('User ID is required'),
});
type AddBudgetInput = z.infer<typeof AddBudgetInputSchema>;


// --- Helper Functions ---

// Map Prisma Budget (with Decimal amount) to Application Budget Type (with number amount)
const mapPrismaBudgetToApp = (prismaBudget: NonNullable<Awaited<ReturnType<typeof prisma.budget.findUnique>>>): Budget => ({
    id: prismaBudget.id,
    category: prismaBudget.category,
    amount: prismaBudget.amount.toNumber(), // Convert Prisma Decimal to number
    period: prismaBudget.period as AppBudgetPeriod, // Cast to AppBudgetPeriod
});

// --- Server Actions ---

export async function getBudgetsAction(userId: string): Promise<Budget[]> {
  if (!userId) {
    console.error('getBudgetsAction: userId is required');
    return [];
  }
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: userId },
      orderBy: { category: 'asc' }, // Prisma sorts case-sensitively by default, adjust if needed
    });
    return budgets.map(mapPrismaBudgetToApp);
  } catch (error) {
    console.error('Error fetching budgets with Prisma:', error);
    throw new Error('Failed to fetch budgets.');
  }
}

/**
 * Adds a new budget or updates an existing one for a specific user based on category and period.
 * Handles case-insensitive category matching for upsert logic.
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
  const categoryLower = category.toLowerCase(); // For case-insensitive check

  try {
    // 1. Find existing budget (case-insensitive)
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId: userId,
        period: period,
        // Case-insensitive search requires finding all and filtering, or DB setup
        // Prisma doesn't have a built-in case-insensitive unique find for this complex key easily.
        // Alternative: Fetch all for the user/period and filter in code.
        // Using Prisma's insensitive mode for query if DB supports it
        category: { mode: 'insensitive', equals: categoryLower },
      }
    });

    let upsertedBudget;
    if (existingBudget) {
      // 2. Update existing budget
      upsertedBudget = await prisma.budget.update({
        where: {
           // Use the unique composite key
           userId_category_period: {
             userId: existingBudget.userId,
             category: existingBudget.category, // Use the actual category from the found record
             period: existingBudget.period,
           }
        },
        data: {
          amount: amount, // Prisma accepts number, converts to Decimal
          category: category, // Update category to potentially fix casing
          updatedAt: new Date(), // Ensure updated_at is set
        },
      });
      console.log(`Updated budget for category: ${category} (${period})`);
    } else {
      // 3. Create new budget
      upsertedBudget = await prisma.budget.create({
        data: {
          userId: userId,
          category: category, // Store original casing
          amount: amount, // Prisma accepts number, converts to Decimal
          period: period,
        },
      });
      console.log(`Created new budget for category: ${category} (${period})`);
    }

    revalidatePath('/budgets');
    revalidatePath('/');
    revalidatePath('/reports');
    return mapPrismaBudgetToApp(upsertedBudget);

  } catch (error: any) { // Catch specific Prisma error
    console.error('Error adding or updating budget with Prisma:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('userId_category_period')) {
        // Handle the unique constraint violation specifically
        // This might occur in race conditions or if the case-insensitive findFirst wasn't perfect
        console.warn(`Budget unique constraint violation for user ${userId}, category ${category}, period ${period}. Attempting update again or inform user.`);
        // You might attempt the update again here, or throw a more specific user-facing error
        throw new Error(`A budget for category '${category}' and period '${period}' already exists. You might need to edit the existing one.`);
    }
    // Handle other potential unique constraint issues if case-insensitive check fails or isn't perfect
    throw new Error('Failed to save budget.');
  }
}


export async function deleteBudgetAction(id: string, userId: string): Promise<void> {
   if (!id || !userId) {
        console.error('deleteBudgetAction: Both id and userId are required.');
        throw new Error('Budget ID and User ID are required.');
    }

  try {
     // Verify ownership before deleting
     const budget = await prisma.budget.findUnique({
         where: { id: id }
     });

     if (!budget) {
         // Changed to return instead of throw to avoid breaking flow if already deleted
         console.warn(`Budget with ID ${id} not found for deletion.`);
         revalidatePath('/budgets'); // Revalidate even if not found, to update the list
         revalidatePath('/');
         revalidatePath('/reports');
         return;
         // throw new Error('Budget not found.');
     }
     if (budget.userId !== userId) {
         throw new Error('User does not have permission to delete this budget.');
     }

    await prisma.budget.delete({
      where: { id: id },
       // No userId check needed here as we verified above
    });

    revalidatePath('/budgets');
    revalidatePath('/');
    revalidatePath('/reports');
  } catch (error: any) {
    console.error('Error deleting budget with Prisma:', error);
    if (error.code === 'P2025') { // Record to delete not found
        console.warn(`Budget with ID ${id} not found for deletion (P2025). Already deleted?`);
        // Treat as success as the item is gone
        revalidatePath('/budgets');
        revalidatePath('/');
        revalidatePath('/reports');
    } else if (error instanceof Error && (error.message.includes('not found') || error.message.includes('permission'))) {
        throw error; // Re-throw specific known errors
    } else {
        throw new Error('Failed to delete budget.');
    }
  }
}


// Remove initializeBudgetsTable function - Prisma handles schema management

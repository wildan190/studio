'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/db'; // Import Prisma client instance
import type { Budget, BudgetPeriod as AppBudgetPeriod } from '@/types';
import { BudgetPeriod as PrismaBudgetPeriod } from '@prisma/client';

// --- Schemas ---

const BudgetSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  amount: z.number(), // Prisma returns number for Decimal/Float
  period: z.nativeEnum(PrismaBudgetPeriod), // Use Prisma enum
  userId: z.string().uuid(), // Renamed from user_id
});

const AddBudgetInputSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Budget amount must be positive'),
  period: z.nativeEnum(PrismaBudgetPeriod, { required_error: 'Period is required' }),
  userId: z.string().uuid('User ID is required'),
});
type AddBudgetInput = z.infer<typeof AddBudgetInputSchema>;


// --- Helper Functions ---

// Map Prisma Budget to Application Budget Type
const mapPrismaBudgetToApp = (prismaBudget: NonNullable<Awaited<ReturnType<typeof prisma.budget.findUnique>>>): Budget => ({
    id: prismaBudget.id,
    category: prismaBudget.category,
    amount: prismaBudget.amount, // Prisma Decimal is number
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
        category: { mode: 'insensitive', equals: categoryLower }, // Use insensitive mode if DB supports
      }
    });

    let upsertedBudget;
    if (existingBudget) {
      // 2. Update existing budget
      upsertedBudget = await prisma.budget.update({
        where: { id: existingBudget.id },
        data: {
          amount: amount,
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
          amount: amount,
          period: period,
        },
      });
      console.log(`Created new budget for category: ${category} (${period})`);
    }

    revalidatePath('/budgets');
    revalidatePath('/');
    revalidatePath('/reports');
    return mapPrismaBudgetToApp(upsertedBudget);

  } catch (error) {
    console.error('Error adding or updating budget with Prisma:', error);
    // Handle potential unique constraint issues if case-insensitive check fails or isn't perfect
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
         throw new Error('Budget not found.');
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
        console.warn(`Budget with ID ${id} not found for deletion (P2025).`);
        // throw new Error('Budget not found.'); // Or treat as success
    } else if (error instanceof Error && (error.message.includes('not found') || error.message.includes('permission'))) {
        throw error; // Re-throw specific known errors
    } else {
        throw new Error('Failed to delete budget.');
    }
  }
}


// Remove initializeBudgetsTable function - Prisma handles schema management

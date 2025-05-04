// scripts/initialize-db.ts
import { pool } from '../src/lib/db'; // Adjust path as needed
import { initializeUsersTable } from '../src/actions/users';
import { initializeTransactionsTable } from '../src/actions/transactions';
import { initializeBudgetsTable } from '../src/actions/budgets';

async function initializeDatabase() {
  console.log('Starting database initialization...');
  try {
    // Initialize tables sequentially to handle dependencies (e.g., users before transactions/budgets)
    await initializeUsersTable();
    await initializeTransactionsTable();
    await initializeBudgetsTable();

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1); // Exit with error code
  } finally {
    await pool.end(); // Close the connection pool
    console.log('Database connection pool closed.');
  }
}

initializeDatabase();

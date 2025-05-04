import { Pool } from 'pg';

// Ensure the environment variable is loaded
if (!process.env.POSTGRES_URL) {
  throw new Error('Missing environment variable: POSTGRES_URL');
}

// Create a connection pool
// The pool manages multiple client connections automatically
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  // You might need SSL configuration depending on your PostgreSQL provider
  // ssl: {
  //   rejectUnauthorized: false, // Use only for development/testing if necessary
  // },
});

// Optional: Test the connection on startup (can be useful for debugging)
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release(); // Release the client back to the pool
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Successfully connected to PostgreSQL database at:', result.rows[0].now);
  });
});

// Example usage (you'll use this in your Server Actions or API routes):
// import { pool } from '@/lib/db';
//
// async function getData() {
//   const client = await pool.connect();
//   try {
//     const res = await client.query('SELECT * FROM your_table');
//     return res.rows;
//   } finally {
//     client.release(); // Always release the client
//   }
// }

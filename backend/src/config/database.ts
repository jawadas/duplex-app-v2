import mysql, { Pool, PoolOptions, RowDataPacket, FieldPacket, QueryOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import { dbLogger } from './logger.config';

dotenv.config();

const poolConfig: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool: Pool = mysql.createPool(poolConfig);

// Log database connection status
pool.on('connection', (connection) => {
  dbLogger.info('New database connection established', {
    threadId: connection.threadId
  });
});

// @ts-ignore
pool.on('error', (err: Error) => {
  dbLogger.error('Database pool error', {
    error: err.message,
    code: (err as any).code,
    stack: err.stack
  });
});

// Test the database connection
pool.getConnection()
  .then(connection => {
    console.log('Database connection established successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

// Extend the pool query method with proper typing
type QueryResultType<T> = T & RowDataPacket[];

async function query<T>(
  sql: string | QueryOptions,
  values?: any[]
): Promise<[QueryResultType<T>, FieldPacket[]]> {
  try {
    if (typeof sql === 'string') {
      const [rows, fields] = await pool.execute<QueryResultType<T>>(sql, values);
      return [rows, fields];
    } else {
      const [rows, fields] = await pool.execute<QueryResultType<T>>(sql.sql, values);
      return [rows, fields];
    }
  } catch (error) {
    dbLogger.error('Database query error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sql: typeof sql === 'string' ? sql : sql.sql,
      values
    });
    throw error;
  }
}

// Add the typed query method to the pool
(pool as any).query = query;

export default pool;

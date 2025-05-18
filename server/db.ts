import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool for PostgreSQL with proper connection parameters
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10
});

// Create Drizzle ORM instance with proper configuration for PostgreSQL
export const db = drizzle(pool, { schema });
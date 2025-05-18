import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with WebSocket support for serverless environment
neonConfig.webSocketConstructor = ws;

// Improved error handling for database URL
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is missing");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool with improved configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000, // 10 second timeout
  idleTimeoutMillis: 60000, // 1 minute idle timeout
});

// Connect to the database and log success/failure
pool.connect()
  .then(() => {
    console.log("Successfully connected to PostgreSQL database");
  })
  .catch(err => {
    console.error("Error connecting to PostgreSQL database:", err.message);
  });

// Custom mapper for handling PostgreSQL date/time values
const customMappers = {
  // Ensure dates are properly converted between JavaScript and PostgreSQL
  timestamp: {
    parse: (value: unknown) => value instanceof Date ? value : new Date(value as string),
    serialize: (value: unknown) => {
      // Handle null, undefined, and invalid date values safely
      if (value === null || value === undefined) return null;
      
      // Convert string dates to Date objects
      const dateValue = value instanceof Date ? value : new Date(value as string);
      
      // Validate the date is not invalid
      if (isNaN(dateValue.getTime())) {
        console.warn("Invalid date encountered:", value);
        return null;
      }
      
      return dateValue;
    }
  }
};

// Create Drizzle ORM instance with proper configuration and custom mappers
export const db = drizzle(pool, { 
  schema,
  logger: true,
  // @ts-ignore - Type issues with custom mappers but it works at runtime
  mapper: customMappers
});
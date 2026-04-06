import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const PROD_PROJECT_REF = "sfwecmjbqhurglcdsmbb";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    // Safety: prevent non-production environments from connecting to the production database
    const env = process.env.PROVISUM_ENV || "development";
    if (connectionString.includes(PROD_PROJECT_REF) && env !== "production") {
      throw new Error(
        `FATAL: ${env} environment is attempting to connect to the PRODUCTION database. ` +
        `Set DATABASE_URL to the demo database or set PROVISUM_ENV=production.`
      );
    }

    const client = postgres(connectionString, { max: 5, prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

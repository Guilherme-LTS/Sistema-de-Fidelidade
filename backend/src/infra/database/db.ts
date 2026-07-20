import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../../config/env.js";
import * as schema from "./schema.js";

const { Pool } = pg;

// Pool administrativo para migrações e operações do admin
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

// Pool da aplicação com fallback para o APP_DATABASE_URL ou DATABASE_URL
export const appPool = new Pool({
  connectionString: env.APP_DATABASE_URL || env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const appDb = drizzle(appPool, { schema });

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { logger } from "@/lib/logger";
import { SCHEMA_SQL } from "./schema";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "repomind.db");

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    logger.info("db", "Created database directory", { path: DB_DIR });
  }
}

function createConnection(): Database.Database {
  ensureDbDir();

  const db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(SCHEMA_SQL);

  logger.info("db", "Database initialized", { path: DB_PATH });

  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.db) {
    globalForDb.db = createConnection();
  }
  return globalForDb.db;
}

export function closeDb(): void {
  if (globalForDb.db) {
    globalForDb.db.close();
    globalForDb.db = undefined;
    logger.info("db", "Database connection closed");
  }
}

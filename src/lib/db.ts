import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type SqlValue = string | number | bigint | null | Uint8Array;

export interface DbStatement {
  sql: string;
  params?: SqlValue[];
}

export interface DbClient {
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }>;
  batch(statements: DbStatement[]): Promise<void>;
}

interface DbGlobal {
  __reservasiOnlineDb?: DatabaseSync;
}

function openDatabase(): DatabaseSync {
  const dbPath =
    process.env.RESERVASI_ONLINE_DB_PATH ||
    path.join(process.cwd(), "data", "reservasi-online.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const raw = new DatabaseSync(dbPath);
  raw.exec("PRAGMA foreign_keys = ON;");
  raw.exec("PRAGMA journal_mode = WAL;");
  raw.exec("PRAGMA busy_timeout = 5000;");
  raw.exec("PRAGMA synchronous = NORMAL;");
  return raw;
}

function getRawDb(): DatabaseSync {
  const target = globalThis as typeof globalThis & DbGlobal;
  if (!target.__reservasiOnlineDb) {
    target.__reservasiOnlineDb = openDatabase();
  }
  return target.__reservasiOnlineDb;
}

export const db: DbClient = {
  async all<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
    const statement = getRawDb().prepare(sql);
    return statement.all(...params) as T[];
  },

  async get<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
    const statement = getRawDb().prepare(sql);
    const row = statement.get(...params);
    return (row as T | undefined) ?? null;
  },

  async run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }> {
    const statement = getRawDb().prepare(sql);
    const result = statement.run(...params);
    return { changes: Number(result.changes) };
  },

  async batch(statements: DbStatement[]): Promise<void> {
    const raw = getRawDb();
    raw.exec("BEGIN IMMEDIATE;");
    try {
      for (const statement of statements) {
        raw.prepare(statement.sql).run(...(statement.params ?? []));
      }
      raw.exec("COMMIT;");
    } catch (error) {
      raw.exec("ROLLBACK;");
      throw error;
    }
  },
};

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
  __reservasiOnlineDb?: DbClient;
}

interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

interface CloudflareEnvLike {
  DB?: D1DatabaseLike;
}

class SqliteDbClient implements DbClient {
  private raw: DatabaseSync;

  constructor() {
    const dbPath =
      process.env.RESERVASI_ONLINE_DB_PATH ||
      path.join(process.cwd(), "data", "reservasi-online.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.raw = new DatabaseSync(dbPath);
    this.raw.exec("PRAGMA foreign_keys = ON;");
    this.raw.exec("PRAGMA journal_mode = WAL;");
    this.raw.exec("PRAGMA busy_timeout = 5000;");
    this.raw.exec("PRAGMA synchronous = NORMAL;");
  }

  async all<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
    const statement = this.raw.prepare(sql);
    return statement.all(...params) as T[];
  }

  async get<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
    const statement = this.raw.prepare(sql);
    const row = statement.get(...params);
    return (row as T | undefined) ?? null;
  }

  async run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }> {
    const statement = this.raw.prepare(sql);
    const result = statement.run(...params);
    return { changes: Number(result.changes) };
  }

  async batch(statements: DbStatement[]): Promise<void> {
    this.raw.exec("BEGIN IMMEDIATE;");
    try {
      for (const statement of statements) {
        this.raw.prepare(statement.sql).run(...(statement.params ?? []));
      }
      this.raw.exec("COMMIT;");
    } catch (error) {
      this.raw.exec("ROLLBACK;");
      throw error;
    }
  }
}

class D1DbClient implements DbClient {
  constructor(private binding: D1DatabaseLike) {}

  async all<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
    const result = await this.binding.prepare(sql).bind(...params).all<T>();
    return result?.results ?? [];
  }

  async get<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
    const result = await this.binding.prepare(sql).bind(...params).first<T>();
    return result ?? null;
  }

  async run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }> {
    const result = await this.binding.prepare(sql).bind(...params).run();
    return { changes: Number(result?.meta?.changes ?? 0) };
  }

  async batch(statements: DbStatement[]): Promise<void> {
    const prepared = statements.map((statement) =>
      this.binding.prepare(statement.sql).bind(...(statement.params ?? [])),
    );
    await this.binding.batch(prepared);
  }
}

async function openDatabase(): Promise<DbClient> {
  // Path SQLite eksplisit selalu menang (integration test, skrip admin, dsb.)
  // agar konteks D1/miniflare tidak membajak koneksi database lokal.
  const explicitPath = process.env.RESERVASI_ONLINE_DB_PATH;
  if (!explicitPath) {
    try {
      const cloudflare = await import("@opennextjs/cloudflare");
      const context = cloudflare.getCloudflareContext?.();
      const env = context?.env as CloudflareEnvLike | undefined;
      if (env?.DB) {
        return new D1DbClient(env.DB);
      }
    } catch {
      // Local Node.js runtime or Cloudflare context unavailable.
    }
  }

  const target = globalThis as typeof globalThis & DbGlobal;
  if (!target.__reservasiOnlineDb) {
    target.__reservasiOnlineDb = new SqliteDbClient();
  }
  return target.__reservasiOnlineDb;
}

const dbPromise = openDatabase();

export const db: DbClient = {
  async all<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
    return (await dbPromise).all<T>(sql, ...params);
  },
  async get<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
    return (await dbPromise).get<T>(sql, ...params);
  },
  async run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }> {
    return (await dbPromise).run(sql, ...params);
  },
  async batch(statements: DbStatement[]): Promise<void> {
    return (await dbPromise).batch(statements);
  },
};

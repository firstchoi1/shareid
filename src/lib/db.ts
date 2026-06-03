import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __shareidPgPool: Pool | undefined;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function hasDatabaseConfig() {
  return getDatabaseUrl() !== "";
}

function createPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new Pool({
    connectionString,
    max: 10,
  });
}

export function getPool() {
  if (!globalThis.__shareidPgPool) {
    globalThis.__shareidPgPool = createPool();
  }

  return globalThis.__shareidPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(sql, params);
}

export async function withTransaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

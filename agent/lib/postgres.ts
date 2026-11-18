import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runReadOnlySql<T>(sql: string): Promise<T> {
  const connectionString = process.env.DEMO_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DEMO_DATABASE_URL is not configured for the demo agent");
  }

  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);

  const { stdout } = await execFileAsync(
    "psql",
    [
      "--no-psqlrc",
      "--host",
      url.hostname,
      "--port",
      url.port || "5432",
      "--username",
      username,
      "--dbname",
      database,
      "--tuples-only",
      "--no-align",
      "--command",
      sql,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: password,
        PGSSLMODE: url.searchParams.get("sslmode") ?? "require",
      },
      maxBuffer: 2_000_000,
    },
  );

  const result = stdout.trim();
  if (!result) return [] as T;
  return JSON.parse(result) as T;
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

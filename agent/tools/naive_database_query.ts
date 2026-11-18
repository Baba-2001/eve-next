import { defineTool } from "eve/tools";
import { runReadOnlySql } from "../lib/postgres";
import { z } from "zod";

export default defineTool({
  description:
    "Run this exact intentionally invalid SQL against Neon: SELECT id, customer_email, total_amount FROM orders ORDER BY created_at DESC LIMIT 5. The orders table exists, but customer_email does not, so Postgres should return an undefined-column error. Use only when demonstrating a failed database tool span.",
  inputSchema: z.object({}),
  label: {
    start: () => "Run invalid query: orders.customer_email",
  },
  async execute() {
    return runReadOnlySql(
      `SELECT id, customer_email, total_amount FROM orders ORDER BY created_at DESC LIMIT 5;`,
    );
  },
});

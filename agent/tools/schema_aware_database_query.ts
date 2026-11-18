import { defineTool } from "eve/tools";
import { quoteIdentifier, runReadOnlySql } from "../lib/postgres";
import { z } from "zod";

type TableSchema = {
  table_schema: string;
  table_name: string;
  columns: Array<{ name: string; data_type: string }>;
};

export default defineTool({
  description:
    "Answer a business question by first reading information_schema, verifying the real tables and columns, then constructing a read-only query. Never guess table or column names. Supports orders from users younger than 25, recent orders, or a schema summary.",
  inputSchema: z.object({
    question: z.enum(["orders_for_users_under_25", "recent_orders", "summarize_schema"]),
  }),
  label: {
    start: ({ question }) =>
      question === "summarize_schema"
        ? "Inspect database schema"
        : question === "orders_for_users_under_25"
          ? "Find orders from users under 25"
          : "Find recent orders",
  },
  async execute({ question }) {
    const schema = await runReadOnlySql<TableSchema[]>(`
      SELECT COALESCE(json_agg(table_row), '[]'::json)::text
      FROM (
        SELECT
          table_schema,
          table_name,
          json_agg(json_build_object('name', column_name, 'data_type', data_type)
            ORDER BY ordinal_position) AS columns
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        GROUP BY table_schema, table_name
        ORDER BY table_schema, table_name
      ) AS table_row;
    `);

    if (question === "summarize_schema") {
      return { strategy: "schema-first", tables: schema };
    }

    const hasColumns = (tableName: string, required: string[]) => {
      const table = schema.find((candidate) => candidate.table_name === tableName);
      return table && required.every((column) => table.columns.some((item) => item.name === column))
        ? table
        : undefined;
    };

    if (question === "orders_for_users_under_25") {
      const users = hasColumns("users", ["id", "name", "age"]);
      const orders = hasColumns("orders", ["id", "user_id", "order_number", "status", "total_amount", "created_at"]);

      if (!users || !orders) {
        return { strategy: "schema-first", question, error: "Required users/orders columns were not found", tables: schema };
      }

      const usersTable = `${quoteIdentifier(users.table_schema)}.${quoteIdentifier(users.table_name)}`;
      const ordersTable = `${quoteIdentifier(orders.table_schema)}.${quoteIdentifier(orders.table_name)}`;
      const rows = await runReadOnlySql<unknown[]>(`
        SELECT COALESCE(json_agg(row_to_json(data_row)), '[]'::json)::text
        FROM (
          SELECT u.${quoteIdentifier("name")} AS user_name,
                 u.${quoteIdentifier("age")} AS user_age,
                 o.${quoteIdentifier("order_number")} AS order_number,
                 o.${quoteIdentifier("status")} AS order_status,
                 o.${quoteIdentifier("total_amount")} AS total_amount
          FROM ${usersTable} u
          JOIN ${ordersTable} o ON o.${quoteIdentifier("user_id")} = u.${quoteIdentifier("id")}
          WHERE u.${quoteIdentifier("age")} < 25
          ORDER BY o.${quoteIdentifier("created_at")} DESC NULLS LAST
          LIMIT 25
        ) AS data_row;
      `);

      return { strategy: "schema-first", question, selectedTables: ["users", "orders"], rows };
    }

    const table = hasColumns("orders", ["id", "order_number", "status", "total_amount", "created_at"])
      ?? schema.find((candidate) => candidate.columns.length > 0);
    if (!table) {
      return { strategy: "schema-first", tables: [], rows: [] };
    }

    const columns = table.columns.slice(0, 8).map((column) => quoteIdentifier(column.name));
    const orderColumn = table.columns.find((column) =>
      /^(created_at|updated_at|timestamp|date)$/i.test(column.name),
    );
    const qualifiedTable = `${quoteIdentifier(table.table_schema)}.${quoteIdentifier(table.table_name)}`;
    const orderBy = orderColumn
      ? ` ORDER BY ${quoteIdentifier(orderColumn.name)} DESC NULLS LAST`
      : "";

    const rows = await runReadOnlySql<unknown[]>(`
      SELECT COALESCE(json_agg(row_to_json(data_row)), '[]'::json)::text
      FROM (
        SELECT ${columns.join(", ")} FROM ${qualifiedTable}${orderBy} LIMIT 10
      ) AS data_row;
    `);

    return {
      strategy: "schema-first",
      question,
      selectedTable: `${table.table_schema}.${table.table_name}`,
      selectedColumns: table.columns.slice(0, 8).map((column) => column.name),
      rows,
    };
  },
});

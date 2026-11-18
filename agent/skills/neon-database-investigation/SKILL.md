---
description: Investigate a Neon Postgres database safely using the schema-aware query tool and explain the result for a demo audience.
---

# Neon database investigation

Use this procedure when the presenter asks the agent to query the connected
Neon database.

1. Explain that the database tools are read-only and credentials stay server-side.
2. For the failure demonstration, call `naive_database_query` only when the
   presenter explicitly asks for the naive or bad query. It executes exactly
   `SELECT id, customer_email, total_amount FROM orders ORDER BY created_at
   DESC LIMIT 5;`; `customer_email` is intentionally not a real column, so
   the undefined-column error is expected.
3. For a reliable answer, call `schema_aware_database_query`. It must inspect
   `information_schema` before selecting a table or column.
4. For the business question “get orders for users younger than 25”, use the
   `orders_for_users_under_25` option. This joins `users.age` to
   `orders.user_id` only after confirming both schemas.
5. For recent orders, use `recent_orders`.
6. Never invent a table name, column name, customer identity, or SQL result.
7. Report the selected table, selected columns, row count, and any limitation.
6. If the database is empty, say so clearly and show the discovered schema.

The intended trace tree for the reliable path is:

```text
agent turn
└── model step
    └── schema_aware_database_query
        ├── information_schema inspection
        └── read-only data query
```

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const statements = readFileSync("db/schema.sql", "utf8")
  // Strip line comments first - otherwise a statement preceded by a comment
  // looks like a comment and gets skipped.
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} statements\n`);
for (const stmt of statements) {
  await sql.query(stmt);
  console.log(`  ok  ${stmt.split("\n")[0].slice(0, 60)}`);
}

const tables = await sql`
  select t.table_name,
         (select count(*) from information_schema.columns c
          where c.table_name = t.table_name and c.table_schema = 'public') as cols
  from information_schema.tables t
  where t.table_schema = 'public'
  order by t.table_name
`;
console.log("\nTables:");
for (const t of tables) console.log(`  ${t.table_name.padEnd(20)} ${t.cols} columns`);

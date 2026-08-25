/**
 * Replaces typographic characters with ASCII equivalents across every text
 * column in the database.
 *
 * Source files are easy to sweep; stored copy is not. Tutorial steps and
 * container data are both written once and then read by users forever, so a
 * find-and-replace over the repository misses them entirely.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const MAP = {
  "—": "-",   // em dash
  "–": "-",   // en dash
  "…": "...", // ellipsis
  "“": '"', "”": '"',
  "‘": "'", "’": "'",
};

const PATTERN = "[—–…“”‘’]";

const clean = (s) =>
  Object.entries(MAP).reduce((acc, [a, b]) => acc.split(a).join(b), s);

const columns = await sql`
  select c.table_name, c.column_name
  from information_schema.columns c
  join information_schema.tables t
    on t.table_name = c.table_name and t.table_schema = c.table_schema
  where c.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and c.data_type in ('text', 'character varying')
  order by c.table_name, c.column_name
`;

let fixed = 0;
for (const { table_name, column_name } of columns) {
  const rows = await sql.query(
    `select id, "${column_name}" as v from "${table_name}" where "${column_name}" ~ '${PATTERN}'`,
  );
  for (const row of rows) {
    await sql.query(
      `update "${table_name}" set "${column_name}" = $1 where id = $2`,
      [clean(row.v), row.id],
    );
    console.log(`  ${table_name}.${column_name} (${row.id}): ${JSON.stringify(row.v)} -> ${JSON.stringify(clean(row.v))}`);
    fixed++;
  }
}

console.log(fixed ? `\nCleaned ${fixed} value(s).` : "Nothing to clean.");

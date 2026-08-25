import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const [{ requests }] = await sql`select count(*)::int as requests from requests`;
const [{ progress }] = await sql`select count(*)::int as progress from tutorial_progress`;

await sql`delete from requests`;
await sql`delete from tutorial_progress`;

console.log(`Cleared ${requests} requests and ${progress} progress rows.`);
console.log("Containers and tutorials are untouched - the demo starts clean.");

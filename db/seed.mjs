import { neon } from "@neondatabase/serverless";
import { CONTAINERS } from "../src/lib/seed.ts";

const sql = neon(process.env.DATABASE_URL);

for (const c of CONTAINERS) {
  await sql`
    insert into containers (
      id, iso_type, line, vessel, voyage, status, yard_position,
      discharged_at, free_days_remaining, gross_weight_kg, holds, consignee
    ) values (
      ${c.id}, ${c.isoType}, ${c.line}, ${c.vessel}, ${c.voyage}, ${c.status},
      ${c.yardPosition}, ${c.dischargedAt}, ${c.freeDaysRemaining},
      ${c.grossWeightKg}, ${c.holds}, ${c.consignee}
    )
    on conflict (id) do update set
      status = excluded.status,
      yard_position = excluded.yard_position,
      free_days_remaining = excluded.free_days_remaining,
      holds = excluded.holds
  `;
}

const [{ count }] = await sql`select count(*)::int as count from containers`;
const byStatus = await sql`
  select status, count(*)::int as n from containers group by status order by n desc
`;
console.log(`Seeded ${count} containers`);
for (const r of byStatus) console.log(`  ${r.status.padEnd(16)} ${r.n}`);

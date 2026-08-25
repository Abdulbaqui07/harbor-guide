import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const TUTORIAL = {
  id: "tut_gate_release",
  slug: "first-gate-release",
  title: "Book your first gate release",
  description:
    "From signing in to a confirmed collection reference, in thirteen steps.",
  source: "handwritten",
};

// action: click | input | select | observe
const STEPS = [
  { page: "login", target_id: "login-submit", action: "click",
    title: "Sign in",
    message: "The demo account is already filled in. Select Sign in to continue." },

  { page: "dashboard", target_id: "kpi-ready", action: "observe",
    title: "What's ready to move",
    message: "This counts containers cleared by customs and finance. Only these can be collected today." },

  { page: "dashboard", target_id: "nav-search", action: "click",
    title: "Find your container",
    message: "Open Containers to search the yard by number, vessel or consignee." },

  { page: "search", target_id: "search-input", action: "input",
    expected_value: "MSKU7482913",
    title: "Enter the container number",
    message: "Type MSKU7482913 - the number printed on the container door." },

  { page: "search", target_id: "search-submit", action: "click",
    title: "Run the search",
    message: "Select Search to filter the yard down to that container." },

  { page: "search", target_id: "result-MSKU7482913", action: "click",
    title: "Open the result",
    message: "One match. Select it to see the full record." },

  { page: "container-detail", target_id: "container-details", action: "observe",
    title: "Check free time first",
    message: "Free time left is the days before storage charges start. Book collection before it reaches zero." },

  { page: "container-detail", target_id: "create-request", action: "click",
    title: "Start the request",
    message: "This container has no holds, so you can raise a request. Select Create request." },

  { page: "new-request", target_id: "request-type", action: "select",
    expected_value: "Gate Release",
    title: "Choose the request type",
    message: "Gate Release authorises a haulier to collect. Leave it selected." },

  { page: "new-request", target_id: "request-haulier", action: "input",
    title: "Name the haulier",
    message: "The transport company collecting the box - try Al Noor Transport LLC. The grey text is only a hint, so you do need to type it." },

  { page: "new-request", target_id: "request-date", action: "input",
    title: "Pick the collection date",
    message: "Choose a date inside your remaining free time." },

  { page: "new-request", target_id: "request-submit", action: "click",
    title: "Submit",
    message: "Send the request to the yard team." },

  { page: "request-confirmation", target_id: "request-confirmation", action: "observe",
    title: "Keep the reference",
    message: "Your haulier quotes this reference at the gate. You can find it again under Requests." },
];

await sql`
  insert into tutorials (id, slug, title, description, source, status, version)
  values (${TUTORIAL.id}, ${TUTORIAL.slug}, ${TUTORIAL.title},
          ${TUTORIAL.description}, ${TUTORIAL.source}, 'published', 1)
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    version = tutorials.version + 1
`;

await sql`delete from tutorial_steps where tutorial_id = ${TUTORIAL.id}`;

let seq = 1;
for (const s of STEPS) {
  await sql`
    insert into tutorial_steps
      (tutorial_id, sequence, page, target_id, title, message, action, expected_value)
    values
      (${TUTORIAL.id}, ${seq}, ${s.page}, ${s.target_id}, ${s.title},
       ${s.message}, ${s.action}, ${s.expected_value ?? null})
  `;
  seq++;
}

const rows = await sql`
  select sequence, page, target_id, action from tutorial_steps
  where tutorial_id = ${TUTORIAL.id} order by sequence
`;
console.log(`Seeded "${TUTORIAL.title}" - ${rows.length} steps\n`);
for (const r of rows) {
  console.log(`  ${String(r.sequence).padStart(2)}. ${r.page.padEnd(22)} ${r.action.padEnd(8)} ${r.target_id}`);
}

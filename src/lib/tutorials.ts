import { sql } from "./db";

export type TutorialAction = "click" | "input" | "select" | "observe";

export type TutorialStep = {
  sequence: number;
  page: string;
  targetId: string;
  title: string;
  message: string;
  action: TutorialAction;
  expectedValue: string | null;
};

export type Tutorial = {
  id: string;
  slug: string;
  title: string;
  description: string;
  version: number;
  source: string;
  steps: TutorialStep[];
};

type TutorialRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  version: number;
  source: string;
};

type StepRow = {
  sequence: number;
  page: string;
  target_id: string;
  title: string;
  message: string;
  action: string;
  expected_value: string | null;
};

export async function getTutorial(slug: string): Promise<Tutorial | null> {
  const rows = (await sql`
    select id, slug, title, description, version, source
    from tutorials
    where slug = ${slug} and status = 'published'
    limit 1
  `) as TutorialRow[];

  const tutorial = rows[0];
  if (!tutorial) return null;

  const steps = (await sql`
    select sequence, page, target_id, title, message, action, expected_value
    from tutorial_steps
    where tutorial_id = ${tutorial.id}
    order by sequence
  `) as StepRow[];

  return {
    ...tutorial,
    steps: steps.map((s) => ({
      sequence: s.sequence,
      page: s.page,
      targetId: s.target_id,
      title: s.title,
      message: s.message,
      action: s.action as TutorialAction,
      expectedValue: s.expected_value,
    })),
  };
}

export async function listTutorials() {
  return (await sql`
    select t.id, t.slug, t.title, t.description, t.version, t.source,
           (select count(*)::int from tutorial_steps s where s.tutorial_id = t.id) as step_count
    from tutorials t
    where t.status = 'published'
    order by t.created_at
  `) as (TutorialRow & { step_count: number })[];
}

export async function saveProgress(input: {
  userKey: string;
  slug: string;
  currentStep: number;
  completed: boolean;
}) {
  const rows = (await sql`
    select id from tutorials where slug = ${input.slug} limit 1
  `) as { id: string }[];
  if (!rows[0]) return null;

  await sql`
    insert into tutorial_progress (user_key, tutorial_id, current_step, completed_at, updated_at)
    values (
      ${input.userKey}, ${rows[0].id}, ${input.currentStep},
      ${input.completed ? new Date().toISOString() : null}, now()
    )
    on conflict (user_key, tutorial_id) do update set
      current_step = excluded.current_step,
      completed_at = coalesce(tutorial_progress.completed_at, excluded.completed_at),
      updated_at = now()
  `;
  return true;
}

export async function getProgress(userKey: string, slug: string) {
  const rows = (await sql`
    select p.current_step, p.completed_at
    from tutorial_progress p
    join tutorials t on t.id = p.tutorial_id
    where p.user_key = ${userKey} and t.slug = ${slug}
    limit 1
  `) as { current_step: number; completed_at: string | null }[];
  return rows[0] ?? null;
}

import Link from "next/link";

const apps = [
  {
    href: "/login",
    eyebrow: "Application 1",
    title: "Harbor Terminal Portal",
    body: "The hosted product. Sign in, scan the yard dashboard, search a container, open its details, and raise a gate-release request.",
    flow: ["Login", "Dashboard", "Search", "Result", "Request", "Submitted"],
    cta: "Open the portal",
    ready: true,
  },
  {
    href: "/guide",
    eyebrow: "Application 2",
    title: "Harbor Guide",
    body: "The tutorial platform. It walks a brand-new user from a browser search all the way through their first completed request, highlighting each control as they go.",
    flow: ["Discover", "Search results", "Land", "Guided steps", "Verified"],
    cta: "Start the walkthrough",
    ready: false,
  },
];

const milestones = [
  { label: "Scaffold & hosting", done: true },
  { label: "Portal flow", done: true },
  { label: "Tutorial engine", done: true },
  { label: "Search discovery", done: false },
  { label: "AI step authoring", done: false },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Harbor
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          A product, and something that teaches you to use it.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Two applications on one deployment. A working container-terminal portal,
          and a tutorial platform that takes a first-time user from a browser
          search result to a completed request without anyone sitting next to them.
        </p>
      </header>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {apps.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="group flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                {app.eyebrow}
              </p>
              {!app.ready && (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Building
                </span>
              )}
            </div>
            <h2 className="mt-3 text-xl font-semibold">{app.title}</h2>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">
              {app.body}
            </p>
            <ol className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-2 font-mono text-[11px] text-muted">
              {app.flow.map((step, i) => (
                <li key={step} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="text-border">→</span>}
                  <span className="rounded bg-surface-2 px-1.5 py-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm font-medium text-accent">
              {app.cta}{" "}
              <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-14 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">Build progress</h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {milestones.map((m) => (
            <li key={m.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${m.done ? "bg-ok" : "bg-border"}`}
              />
              <span className={m.done ? "text-foreground" : "text-muted"}>
                {m.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 font-mono text-xs text-muted">
        <Link href="/api/health" className="hover:text-accent">
          /api/health
        </Link>
      </footer>
    </main>
  );
}

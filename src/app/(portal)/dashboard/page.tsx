import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listContainers, listRequests } from "@/lib/store";
import { Card, PageHeading, StatusBadge } from "@/components/ui";

export default async function DashboardPage() {
  const session = await requireSession();
  const containers = await listContainers();
  const requests = await listRequests();

  const readyToCollect = containers.filter((c) => c.status === "Gate Out Ready");
  const onHold = containers.filter((c) => c.status === "On Hold");
  const expiringSoon = containers.filter(
    (c) => c.freeDaysRemaining > 0 && c.freeDaysRemaining <= 3,
  );

  const tiles = [
    { label: "In the yard", value: containers.length, tid: "kpi-total" },
    { label: "Ready to collect", value: readyToCollect.length, tid: "kpi-ready" },
    { label: "On hold", value: onHold.length, tid: "kpi-hold" },
    { label: "Free time expiring", value: expiringSoon.length, tid: "kpi-expiring" },
  ];

  return (
    <main
      data-tutorial-page="dashboard"
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-10"
    >
      <PageHeading eyebrow={`Welcome back, ${session.name}`} title="Yard overview">
        Everything {session.company} currently has on the terminal, and what needs
        attention before free time runs out.
      </PageHeading>

      <div
        data-tutorial-id="kpi-row"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {tiles.map((tile) => (
          <Card key={tile.label} data-tutorial-id={tile.tid} className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted">
              {tile.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {tile.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card data-tutorial-id="ready-panel" className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Ready to collect</h2>
            <Link
              href="/search?status=Gate+Out+Ready"
              data-tutorial-id="ready-view-all"
              className="text-sm text-accent hover:underline"
            >
              View all
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {readyToCollect.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/containers/${c.id}`}
                  className="flex items-center gap-4 py-3 transition-opacity hover:opacity-70"
                >
                  <span className="font-mono text-sm">{c.id}</span>
                  <span className="text-xs text-muted">{c.isoType}</span>
                  <span className="ml-auto text-xs text-muted">
                    {c.freeDaysRemaining}d free time
                  </span>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card data-tutorial-id="requests-panel">
          <h2 className="text-sm font-semibold">Your recent requests</h2>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              No requests yet. Find a container and raise a gate release to get
              started.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {requests.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/requests/${r.id}`}
                    className="flex items-center gap-3 py-3 transition-opacity hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{r.containerId}</p>
                      <p className="truncate text-xs text-muted">{r.kind}</p>
                    </div>
                    <span className="ml-auto">
                      <StatusBadge status={r.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/search"
            data-tutorial-id="dashboard-find-container"
            className="mt-5 block rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
          >
            Find a container
          </Link>
        </Card>
      </div>
    </main>
  );
}

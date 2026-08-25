import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listRequests } from "@/lib/store";
import { Card, PageHeading, StatusBadge } from "@/components/ui";

export default async function RequestsPage() {
  const session = await requireSession();
  const requests = await listRequests(session.id);

  return (
    <main
      data-tutorial-page="requests"
      className="mx-auto w-full max-w-4xl flex-1 px-6 py-10"
    >
      <PageHeading eyebrow="Requests" title="Your requests">
        Everything you&apos;ve raised with the terminal, newest first.
      </PageHeading>

      {requests.length === 0 ? (
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            You haven&apos;t raised any requests yet.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
          >
            Find a container
          </Link>
        </Card>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <span className="font-mono text-sm">{r.id}</span>
                <span className="font-mono text-xs text-muted">
                  {r.containerId}
                </span>
                <span className="text-sm text-muted">{r.kind}</span>
                <span className="ml-auto flex items-center gap-4">
                  <span className="text-xs text-muted">{r.collectionDate}</span>
                  <StatusBadge status={r.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

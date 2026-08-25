import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getRequest } from "@/lib/store";
import { Card, Field, StatusBadge } from "@/components/ui";

export default async function RequestPage({
  params,
}: PageProps<"/requests/[id]">) {
  await requireSession();

  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  return (
    <main
      data-tutorial-page="request-confirmation"
      className="mx-auto w-full max-w-2xl flex-1 px-6 py-10"
    >
      <Card data-tutorial-id="request-confirmation">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-ok/12 text-ok"
          >
            ✓
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Request submitted
            </h1>
            <p className="text-sm text-muted">
              The yard team will review it and update the status.
            </p>
          </div>
        </div>

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="Reference" value={request.id} mono />
          <Field label="Status" value={<StatusBadge status={request.status} />} />
          <Field label="Container" value={request.containerId} mono />
          <Field label="Type" value={request.kind} />
          <Field label="Haulier" value={request.haulier} />
          <Field label="Collection date" value={request.collectionDate} />
          {request.notes && (
            <div className="col-span-2">
              <Field label="Notes" value={request.notes} />
            </div>
          )}
        </dl>
      </Card>

      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard"
          data-tutorial-id="back-to-dashboard"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-border px-5 py-2.5 text-sm transition-colors hover:border-accent"
        >
          Find another container
        </Link>
      </div>
    </main>
  );
}

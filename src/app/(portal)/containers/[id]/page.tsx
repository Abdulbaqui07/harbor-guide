import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getContainer } from "@/lib/store";
import { Card, Field, PageHeading, StatusBadge } from "@/components/ui";

export default async function ContainerPage({
  params,
}: PageProps<"/containers/[id]">) {
  await requireSession();

  const { id } = await params;
  const container = await getContainer(id);
  if (!container) notFound();

  const blocked = container.holds.length > 0;

  return (
    <main
      data-tutorial-page="container-detail"
      className="mx-auto w-full max-w-4xl flex-1 px-6 py-10"
    >
      <Link
        href="/search"
        className="text-sm text-muted transition-colors hover:text-accent"
      >
        ← Back to search
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <PageHeading eyebrow="Container" title={container.id} />
        <span className="mb-8">
          <StatusBadge status={container.status} />
        </span>
      </div>

      <Card data-tutorial-id="container-details">
        <h2 className="text-sm font-semibold">Details</h2>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Field label="ISO type" value={container.isoType} />
          <Field label="Shipping line" value={container.line} />
          <Field
            label="Vessel / voyage"
            value={`${container.vessel} · ${container.voyage}`}
          />
          <Field label="Yard position" value={container.yardPosition} mono />
          <Field label="Discharged" value={container.dischargedAt} />
          <Field
            label="Gross weight"
            value={`${container.grossWeightKg.toLocaleString()} kg`}
          />
          <Field label="Consignee" value={container.consignee} />
          <Field
            label="Free time left"
            value={
              container.freeDaysRemaining > 0
                ? `${container.freeDaysRemaining} days`
                : "Expired — demurrage applies"
            }
          />
        </dl>
      </Card>

      {blocked && (
        <Card data-tutorial-id="container-holds" className="mt-5 border-signal/40">
          <h2 className="text-sm font-semibold text-signal">
            {container.holds.length} active{" "}
            {container.holds.length === 1 ? "hold" : "holds"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This container can&apos;t be released until every hold is cleared.
            Contact the terminal desk to resolve:{" "}
            <span className="text-foreground">{container.holds.join(", ")}</span>.
          </p>
        </Card>
      )}

      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Raise a request</h2>
            <p className="mt-1 text-sm text-muted">
              {blocked
                ? "Unavailable while holds are active."
                : "Book collection, a reefer plug-in, an inspection or a reweigh."}
            </p>
          </div>

          {blocked ? (
            <span
              data-tutorial-id="request-blocked"
              className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted"
            >
              Blocked by holds
            </span>
          ) : (
            <Link
              href={`/requests/new?container=${container.id}`}
              data-tutorial-id="create-request"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              Create request
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}

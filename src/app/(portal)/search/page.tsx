import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listContainers, listLines } from "@/lib/store";
import { Card, PageHeading, StatusBadge } from "@/components/ui";

const STATUSES = [
  "Gate Out Ready",
  "In Yard",
  "On Hold",
  "Discharged",
  "Loaded",
];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  await requireSession();

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const line = typeof params.line === "string" ? params.line : "all";

  const [results, lines] = await Promise.all([
    listContainers({ q, status, line }),
    listLines(),
  ]);

  const selectClass =
    "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

  return (
    <main
      data-tutorial-page="search"
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-10"
    >
      <PageHeading eyebrow="Containers" title="Find a container">
        Search by container number, vessel, shipping line or consignee.
      </PageHeading>

      <Card>
        <form
          data-tutorial-id="search-form"
          className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label htmlFor="q" className="block text-sm font-medium">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="MSKU7482913, Maersk Kowloon..."
              data-tutorial-id="search-input"
              className={selectClass}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              data-tutorial-id="search-status"
              className={selectClass}
            >
              <option value="all">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="line" className="block text-sm font-medium">
              Line
            </label>
            <select
              id="line"
              name="line"
              defaultValue={line}
              data-tutorial-id="search-line"
              className={selectClass}
            >
              <option value="all">Any line</option>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            data-tutorial-id="search-submit"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </form>
      </Card>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">
          {results.length} {results.length === 1 ? "container" : "containers"}
        </h2>
      </div>

      {results.length === 0 ? (
        <Card className="mt-3">
          <p className="text-sm text-muted">
            Nothing matched that search. Try a container number or clear the
            filters.
          </p>
        </Card>
      ) : (
        <ul data-tutorial-id="search-results" className="mt-3 space-y-2">
          {results.map((c) => (
            <li key={c.id}>
              <Link
                href={`/containers/${c.id}`}
                data-tutorial-id={`result-${c.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <span className="font-mono text-sm font-medium">{c.id}</span>
                <span className="text-xs text-muted">{c.isoType}</span>
                <span className="text-sm text-muted">
                  {c.vessel} · {c.voyage}
                </span>
                <span className="hidden text-sm text-muted lg:block">
                  {c.consignee}
                </span>
                <span className="ml-auto flex items-center gap-4">
                  <span className="font-mono text-xs text-muted">
                    {c.yardPosition}
                  </span>
                  <StatusBadge status={c.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

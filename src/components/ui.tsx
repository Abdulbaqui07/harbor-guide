import type { ContainerStatus, RequestStatus } from "@/lib/types";

const STATUS_TONE: Record<ContainerStatus | RequestStatus, string> = {
  "Gate Out Ready": "bg-ok/12 text-ok",
  "In Yard": "bg-accent/12 text-accent",
  "On Hold": "bg-signal/16 text-signal",
  Discharged: "bg-surface-2 text-muted",
  Loaded: "bg-surface-2 text-muted",
  Submitted: "bg-accent/12 text-accent",
  "In Review": "bg-signal/16 text-signal",
  Approved: "bg-ok/12 text-ok",
  Rejected: "bg-signal/16 text-signal",
};

export function StatusBadge({
  status,
}: {
  status: ContainerStatus | RequestStatus;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[status]}`}
    >
      {status}
    </span>
  );
}

export function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

export function Card({
  children,
  className = "",
  ...rest
}: React.ComponentProps<"section">) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface p-6 ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      {children && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {children}
        </p>
      )}
    </header>
  );
}

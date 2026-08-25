import Link from "next/link";
import { getSession } from "@/lib/session";
import HelpButton from "@/components/tutorial/help-button";
import { logoutAction } from "./actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", tid: "nav-dashboard" },
  { href: "/search", label: "Containers", tid: "nav-search" },
  { href: "/requests", label: "Requests", tid: "nav-requests" },
];

export default async function PortalLayout({
  children,
}: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {session && (
        <header
          data-tutorial-id="portal-header"
          className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 font-semibold tracking-tight"
            >
              <span
                aria-hidden
                className="grid size-6 place-items-center rounded bg-accent font-mono text-[11px] text-accent-fg"
              >
                H
              </span>
              Harbor
            </Link>

            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tutorial-id={item.tid}
                  className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-4">
              <HelpButton />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">
                  {session.name}
                </p>
                <p className="text-xs capitalize leading-tight text-muted">
                  {session.role}
                </p>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  data-tutorial-id="logout"
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

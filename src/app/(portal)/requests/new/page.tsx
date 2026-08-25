import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getContainer } from "@/lib/store";
import { PageHeading } from "@/components/ui";
import RequestForm from "./request-form";

export default async function NewRequestPage({
  searchParams,
}: PageProps<"/requests/new">) {
  await requireSession();

  const params = await searchParams;
  const containerId = typeof params.container === "string" ? params.container : "";
  if (!containerId) redirect("/search");

  const container = await getContainer(containerId);
  if (!container) notFound();

  return (
    <main
      data-tutorial-page="new-request"
      className="mx-auto w-full max-w-2xl flex-1 px-6 py-10"
    >
      <PageHeading eyebrow={container.id} title="New request">
        {container.isoType} · {container.vessel} · currently at{" "}
        {container.yardPosition}
      </PageHeading>

      <RequestForm containerId={container.id} />
    </main>
  );
}

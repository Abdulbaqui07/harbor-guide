import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthoringConsole from "./console";

export const metadata = { title: "Author a tutorial - Harbor Guide" };

export default async function AuthoringPage() {
  // Generation costs money per call, so it sits behind the same session as the
  // portal rather than being open to anyone who finds the URL.
  if (!(await getSession())) redirect("/login?next=/guide/authoring");
  return <AuthoringConsole />;
}

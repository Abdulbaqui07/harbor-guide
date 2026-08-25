import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const tutorial = typeof params.tutorial === "string" ? params.tutorial : null;

  if (await getSession()) {
    // Carry the tutorial through the bounce, or the deep link dies here.
    redirect(tutorial ? `/dashboard?tutorial=${tutorial}` : "/dashboard");
  }

  return <LoginForm />;
}

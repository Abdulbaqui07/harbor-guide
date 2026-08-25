import { NextResponse } from "next/server";
import { getTutorial } from "@/lib/tutorials";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/tutorials/[slug]">,
) {
  const { slug } = await ctx.params;
  const tutorial = await getTutorial(slug);

  if (!tutorial) {
    return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  }
  return NextResponse.json(tutorial);
}

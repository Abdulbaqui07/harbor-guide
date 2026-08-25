"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_USER } from "@/lib/seed";
import { createSession, destroySession, requireSession } from "@/lib/session";
import { createRequest } from "@/lib/store";
import type { RequestKind } from "@/lib/types";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;
  if (
    email.toLowerCase() !== DEMO_USER.email ||
    password !== DEMO_USER.password
  ) {
    return { error: "Those credentials don't match an account." };
  }

  await createSession({
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    role: DEMO_USER.role,
    company: DEMO_USER.company,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export type RequestState = { error?: string };

const requestSchema = z.object({
  containerId: z.string().min(1),
  kind: z.enum([
    "Gate Release",
    "Reefer Plug-in",
    "Customs Inspection",
    "Reweigh",
  ]),
  haulier: z.string().min(2, "Enter the haulier or transport company."),
  collectionDate: z.string().min(1, "Pick a collection date."),
  notes: z.string().max(500).optional(),
});

export async function createRequestAction(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const parsed = requestSchema.safeParse({
    containerId: formData.get("containerId"),
    kind: formData.get("kind"),
    haulier: formData.get("haulier"),
    collectionDate: formData.get("collectionDate"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const session = await requireSession();

  const request = await createRequest({
    containerId: parsed.data.containerId,
    userKey: session.id,
    kind: parsed.data.kind as RequestKind,
    haulier: parsed.data.haulier,
    collectionDate: parsed.data.collectionDate,
    notes: parsed.data.notes ?? "",
  });

  redirect(`/requests/${request.id}`);
}

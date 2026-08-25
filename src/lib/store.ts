import { cookies } from "next/headers";
import { CONTAINERS } from "./seed";
import type { Container, RequestKind, TerminalRequest } from "./types";

/**
 * Data access for the portal. Every function is async so the Postgres-backed
 * implementation can drop straight in behind the same signatures.
 */

const REQUESTS_COOKIE = "harbor_requests";

export async function listContainers(query?: {
  q?: string;
  status?: string;
  line?: string;
}): Promise<Container[]> {
  const q = query?.q?.trim().toLowerCase();

  return CONTAINERS.filter((c) => {
    if (query?.status && query.status !== "all" && c.status !== query.status) {
      return false;
    }
    if (query?.line && query.line !== "all" && c.line !== query.line) {
      return false;
    }
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      c.vessel.toLowerCase().includes(q) ||
      c.consignee.toLowerCase().includes(q) ||
      c.line.toLowerCase().includes(q)
    );
  });
}

export async function getContainer(id: string): Promise<Container | null> {
  return CONTAINERS.find((c) => c.id.toUpperCase() === id.toUpperCase()) ?? null;
}

export async function listLines(): Promise<string[]> {
  return [...new Set(CONTAINERS.map((c) => c.line))].sort();
}

async function readRequests(): Promise<TerminalRequest[]> {
  const jar = await cookies();
  const raw = jar.get(REQUESTS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TerminalRequest[]) : [];
  } catch {
    return [];
  }
}

async function writeRequests(requests: TerminalRequest[]) {
  const jar = await cookies();
  // Keep the newest few so the cookie stays well under the 4KB limit.
  jar.set(REQUESTS_COOKIE, JSON.stringify(requests.slice(0, 8)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function listRequests(): Promise<TerminalRequest[]> {
  return readRequests();
}

export async function getRequest(id: string): Promise<TerminalRequest | null> {
  const all = await readRequests();
  return all.find((r) => r.id === id) ?? null;
}

export async function createRequest(input: {
  containerId: string;
  kind: RequestKind;
  haulier: string;
  collectionDate: string;
  notes: string;
}): Promise<TerminalRequest> {
  const request: TerminalRequest = {
    id: `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    containerId: input.containerId,
    kind: input.kind,
    haulier: input.haulier,
    collectionDate: input.collectionDate,
    notes: input.notes,
    status: "Submitted",
    createdAt: new Date().toISOString(),
  };

  const all = await readRequests();
  await writeRequests([request, ...all]);
  return request;
}

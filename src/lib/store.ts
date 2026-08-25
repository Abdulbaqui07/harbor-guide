import { sql } from "./db";
import type {
  Container,
  ContainerStatus,
  HoldKind,
  RequestKind,
  RequestStatus,
  TerminalRequest,
} from "./types";

/** Row shapes as they come back from Postgres. */
type ContainerRow = {
  id: string;
  iso_type: string;
  line: string;
  vessel: string;
  voyage: string;
  status: string;
  yard_position: string;
  discharged_at: string;
  free_days_remaining: number;
  gross_weight_kg: number;
  holds: string[];
  consignee: string;
};

type RequestRow = {
  id: string;
  container_id: string;
  kind: string;
  haulier: string;
  collection_date: string;
  notes: string;
  status: string;
  created_at: string;
};

function toContainer(r: ContainerRow): Container {
  return {
    id: r.id,
    isoType: r.iso_type,
    line: r.line,
    vessel: r.vessel,
    voyage: r.voyage,
    status: r.status as ContainerStatus,
    yardPosition: r.yard_position,
    dischargedAt: r.discharged_at,
    freeDaysRemaining: r.free_days_remaining,
    grossWeightKg: r.gross_weight_kg,
    holds: r.holds as HoldKind[],
    consignee: r.consignee,
  };
}

function toRequest(r: RequestRow): TerminalRequest {
  return {
    id: r.id,
    containerId: r.container_id,
    kind: r.kind as RequestKind,
    haulier: r.haulier,
    collectionDate: r.collection_date,
    notes: r.notes,
    status: r.status as RequestStatus,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function listContainers(query?: {
  q?: string;
  status?: string;
  line?: string;
}): Promise<Container[]> {
  const q = query?.q?.trim() ? `%${query.q.trim()}%` : null;
  const status = query?.status && query.status !== "all" ? query.status : null;
  const line = query?.line && query.line !== "all" ? query.line : null;

  const rows = (await sql`
    select id, iso_type, line, vessel, voyage, status, yard_position,
           discharged_at::text as discharged_at, free_days_remaining,
           gross_weight_kg, holds, consignee
    from containers
    where (${status}::text is null or status = ${status})
      and (${line}::text is null or line = ${line})
      and (
        ${q}::text is null
        or id ilike ${q}
        or vessel ilike ${q}
        or consignee ilike ${q}
        or line ilike ${q}
      )
    order by discharged_at desc, id
  `) as ContainerRow[];

  return rows.map(toContainer);
}

export async function getContainer(id: string): Promise<Container | null> {
  const rows = (await sql`
    select id, iso_type, line, vessel, voyage, status, yard_position,
           discharged_at::text as discharged_at, free_days_remaining,
           gross_weight_kg, holds, consignee
    from containers where upper(id) = upper(${id}) limit 1
  `) as ContainerRow[];
  return rows[0] ? toContainer(rows[0]) : null;
}

export async function listLines(): Promise<string[]> {
  const rows = (await sql`
    select distinct line from containers order by line
  `) as { line: string }[];
  return rows.map((r) => r.line);
}

export async function listRequests(userKey: string): Promise<TerminalRequest[]> {
  const rows = (await sql`
    select id, container_id, kind, haulier,
           collection_date::text as collection_date, notes, status,
           created_at
    from requests
    where user_key = ${userKey}
    order by created_at desc
  `) as RequestRow[];
  return rows.map(toRequest);
}

export async function getRequest(
  id: string,
  userKey: string,
): Promise<TerminalRequest | null> {
  const rows = (await sql`
    select id, container_id, kind, haulier,
           collection_date::text as collection_date, notes, status,
           created_at
    from requests
    where id = ${id} and user_key = ${userKey}
    limit 1
  `) as RequestRow[];
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function createRequest(input: {
  containerId: string;
  userKey: string;
  kind: RequestKind;
  haulier: string;
  collectionDate: string;
  notes: string;
}): Promise<TerminalRequest> {
  const id = `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const rows = (await sql`
    insert into requests (
      id, container_id, user_key, kind, haulier, collection_date, notes, status
    ) values (
      ${id}, ${input.containerId}, ${input.userKey}, ${input.kind},
      ${input.haulier}, ${input.collectionDate}, ${input.notes}, 'Submitted'
    )
    returning id, container_id, kind, haulier,
           collection_date::text as collection_date, notes, status,
           created_at
  `) as RequestRow[];

  return toRequest(rows[0]);
}

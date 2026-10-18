import "server-only";
import { count, q } from "./index";

export interface AuditEntry {
  id: number;
  createdAt: number;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
}

/** Append-only record of sensitive administrative actions. Never store secrets in `details`. */
export async function logAudit(e: { actorId: string | null; action: string; targetType?: string; targetId?: string | number; details?: Record<string, unknown> }) {
  await q("INSERT INTO kinoland.audit_log (created_at, actor_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", [
    Date.now(),
    e.actorId,
    e.action,
    e.targetType ?? null,
    e.targetId === undefined ? null : String(e.targetId),
    e.details ? JSON.stringify(e.details) : null,
  ]);
}

export async function listAudit(opts: { page?: number; perPage?: number; targetId?: string } = {}): Promise<{ items: AuditEntry[]; total: number; page: number; totalPages: number }> {
  const perPage = Math.min(Math.max(opts.perPage ?? 25, 1), 100);
  const where = opts.targetId ? "WHERE a.target_id = $1" : "";
  const params: unknown[] = opts.targetId ? [opts.targetId] : [];
  const total = await count(`SELECT COUNT(*)::int AS n FROM kinoland.audit_log a ${where}`, params);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const rows = await q<{
    id: number;
    created_at: number;
    actor_id: string | null;
    actor_name: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: Record<string, unknown> | null;
  }>(
    `SELECT a.*, u.name AS actor_name FROM kinoland.audit_log a LEFT JOIN kinoland.users u ON u.id = a.actor_id ${where}
     ORDER BY a.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );
  return {
    total,
    page,
    totalPages,
    items: rows.map((r) => ({
      id: Number(r.id),
      createdAt: Number(r.created_at),
      actorId: r.actor_id,
      actorName: r.actor_name,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: r.details,
    })),
  };
}

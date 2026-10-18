import "server-only";
import { getDb } from "./index";

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
export function logAudit(e: { actorId: string | null; action: string; targetType?: string; targetId?: string | number; details?: Record<string, unknown> }) {
  getDb()
    .prepare("INSERT INTO audit_log (created_at, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)")
    .run(Date.now(), e.actorId, e.action, e.targetType ?? null, e.targetId === undefined ? null : String(e.targetId), e.details ? JSON.stringify(e.details) : null);
}

export function listAudit(opts: { page?: number; perPage?: number; targetId?: string } = {}): { items: AuditEntry[]; total: number; page: number; totalPages: number } {
  const perPage = Math.min(Math.max(opts.perPage ?? 25, 1), 100);
  const where = opts.targetId ? "WHERE a.target_id = ?" : "";
  const params = opts.targetId ? [opts.targetId] : [];
  const total = (getDb().prepare(`SELECT COUNT(*) AS n FROM audit_log a ${where}`).get(...params) as { n: number }).n;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const rows = getDb()
    .prepare(
      `SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ${where}
       ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, perPage, (page - 1) * perPage) as unknown as {
    id: number;
    created_at: number;
    actor_id: string | null;
    actor_name: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: string | null;
  }[];
  return {
    total,
    page,
    totalPages,
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      actorId: r.actor_id,
      actorName: r.actor_name,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: r.details ? (JSON.parse(r.details) as Record<string, unknown>) : null,
    })),
  };
}

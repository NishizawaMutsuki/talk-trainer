"use client";

import { useState, useEffect } from "react";

interface AuditEntry {
  id: number;
  admin_google_id: string;
  action_type: string;
  target_user_id: number | null;
  changes: Record<string, unknown>;
  created_at: string;
}

export function AuditSection() {
  const [actions, setActions] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => setActions(d.actions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <h2 className="text-white/50 text-xs tracking-widest uppercase mb-4">操作ログ</h2>

      {loading ? (
        <p className="text-white/30 text-sm">読み込み中...</p>
      ) : actions.length === 0 ? (
        <p className="text-white/20 text-sm">操作ログがありません</p>
      ) : (
        <div className="space-y-2">
          {actions.map((a) => (
            <div key={a.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                  {a.action_type}
                </span>
                <span className="text-white/25 text-[10px]">{formatDate(a.created_at)}</span>
              </div>
              <p className="text-white/50 text-xs">
                Admin: <span className="font-mono text-[10px]">{a.admin_google_id.slice(0, 12)}…</span>
                {a.target_user_id && <> → User #{a.target_user_id}</>}
              </p>
              <pre className="text-white/30 text-[10px] mt-1 overflow-x-auto">
                {JSON.stringify(a.changes, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

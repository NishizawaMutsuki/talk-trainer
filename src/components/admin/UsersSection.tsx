"use client";

import { useState, useCallback } from "react";

interface UserRow {
  id: number;
  google_id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  usage_count: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface UsersSectionProps {
  onError: (msg: string) => void;
}

export function UsersSection({ onError }: UsersSectionProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editUsage, setEditUsage] = useState("");
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      onError("ユーザー検索に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const selectUser = (u: UserRow) => {
    setSelected(u);
    setEditPlan(u.plan);
    setEditUsage(String(u.usage_count));
  };

  const saveUser = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editPlan !== selected.plan) body.plan = editPlan;
      if (Number(editUsage) !== selected.usage_count) body.usage_count = Number(editUsage);
      if (Object.keys(body).length === 0) { setSaving(false); return; }

      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const data = await res.json();
      setSelected(data.user);
      setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
    } catch {
      onError("ユーザー更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-white/50 text-xs tracking-widest uppercase mb-4">ユーザー管理</h2>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(query)}
          placeholder="メール / 名前 / Google ID で検索"
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30"
        />
        <button
          onClick={() => search(query)}
          className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.1] transition-colors"
        >
          検索
        </button>
      </div>

      {loading && <p className="text-white/30 text-sm">検索中...</p>}

      {/* User list */}
      {users.length > 0 && (
        <div className="border border-white/[0.06] rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">ID</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">メール</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">名前</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">プラン</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">利用回数</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors ${
                    selected?.id === u.id ? "bg-cyan-500/[0.06]" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-white/40">{u.id}</td>
                  <td className="px-3 py-2 text-white/70">{u.email}</td>
                  <td className="px-3 py-2 text-white/50">{u.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.plan === "pro"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-white/10 text-white/50"
                    }`}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/50">{u.usage_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User detail / edit */}
      {selected && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white/70 text-sm font-medium">ユーザー詳細 #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="text-white/30 text-xs hover:text-white/60">✕ 閉じる</button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-white/30">メール:</span> <span className="text-white/70 ml-1">{selected.email}</span></div>
            <div><span className="text-white/30">名前:</span> <span className="text-white/70 ml-1">{selected.name ?? "—"}</span></div>
            <div><span className="text-white/30">Google ID:</span> <span className="text-white/50 ml-1 font-mono text-[10px]">{selected.google_id}</span></div>
            <div><span className="text-white/30">Role:</span> <span className="text-white/70 ml-1">{selected.role}</span></div>
            <div><span className="text-white/30">Stripe Customer:</span> <span className="text-white/50 ml-1 font-mono text-[10px]">{selected.stripe_customer_id ?? "—"}</span></div>
            <div><span className="text-white/30">Stripe Sub:</span> <span className="text-white/50 ml-1 font-mono text-[10px]">{selected.stripe_subscription_id ?? "—"}</span></div>
          </div>

          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-white/30 text-[10px] mb-1">プラン</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white/80 text-sm"
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
              </select>
            </div>
            <div>
              <label className="block text-white/30 text-[10px] mb-1">利用回数</label>
              <input
                type="number"
                value={editUsage}
                onChange={(e) => setEditUsage(e.target.value)}
                className="w-24 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white/80 text-sm"
              />
            </div>
            <button
              onClick={saveUser}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/30 disabled:opacity-50 transition-all"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface SubUser {
  id: number;
  email: string;
  name: string | null;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  usage_count: number;
}

export function SubscriptionsSection() {
  const [subs, setSubs] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/subscriptions")
      .then((r) => r.json())
      .then((d) => setSubs(d.subscriptions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activePro = subs.filter((s) => s.plan === "pro");
  const cancelled = subs.filter((s) => s.plan === "free");

  return (
    <div>
      <h2 className="text-white/50 text-xs tracking-widest uppercase mb-4">サブスクリプション</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/30 text-xs mb-1">アクティブ</p>
          <p className="text-xl text-emerald-400/80">{loading ? "—" : activePro.length}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/30 text-xs mb-1">解約済み</p>
          <p className="text-xl text-red-400/80">{loading ? "—" : cancelled.length}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/30 text-xs mb-1">MRR</p>
          <p className="text-xl text-amber-400/80">{loading ? "—" : `¥${(activePro.length * 990).toLocaleString()}`}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm">読み込み中...</p>
      ) : subs.length === 0 ? (
        <p className="text-white/20 text-sm">サブスクリプションデータがありません</p>
      ) : (
        <div className="border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">メール</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">プラン</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">Stripe Customer</th>
                <th className="text-left px-3 py-2 text-white/30 font-normal text-xs">利用回数</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2 text-white/70">{s.email}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.plan === "pro" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                    }`}>
                      {s.plan === "pro" ? "active" : "cancelled"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/40 font-mono text-[10px]">{s.stripe_customer_id}</td>
                  <td className="px-3 py-2 text-white/50">{s.usage_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

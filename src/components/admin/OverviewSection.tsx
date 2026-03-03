"use client";

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  activeThisMonth: number;
  mrr: number;
}

interface OverviewSectionProps {
  stats: Stats | null;
  loading: boolean;
}

const CARDS = [
  { key: "totalUsers" as const, label: "総ユーザー数", icon: "👥", color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20" },
  { key: "proUsers" as const, label: "Proユーザー", icon: "⭐", color: "from-amber-500/10 to-orange-500/10 border-amber-500/20" },
  { key: "activeThisMonth" as const, label: "月間アクティブ", icon: "📈", color: "from-emerald-500/10 to-green-500/10 border-emerald-500/20" },
  { key: "mrr" as const, label: "MRR", icon: "💰", color: "from-violet-500/10 to-purple-500/10 border-violet-500/20", format: "yen" },
];

export function OverviewSection({ stats, loading }: OverviewSectionProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-white/50 text-xs tracking-widest uppercase mb-4">概要</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c) => {
          const value = stats?.[c.key] ?? 0;
          const display = c.format === "yen" ? `¥${value.toLocaleString()}` : value.toLocaleString();
          return (
            <div key={c.key} className={`bg-gradient-to-br ${c.color} border rounded-xl p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{c.icon}</span>
                <span className="text-white/40 text-xs">{c.label}</span>
              </div>
              <p className="text-2xl font-light text-white/90">{display}</p>
            </div>
          );
        })}
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-white/30 text-xs mb-2">Pro変換率</p>
            <p className="text-lg text-white/80">
              {stats.totalUsers > 0
                ? `${((stats.proUsers / stats.totalUsers) * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-white/30 text-xs mb-2">無料ユーザー</p>
            <p className="text-lg text-white/80">{stats.freeUsers.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

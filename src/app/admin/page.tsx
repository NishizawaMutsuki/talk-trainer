"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { OverviewSection } from "@/components/admin/OverviewSection";
import { UsersSection } from "@/components/admin/UsersSection";
import { SubscriptionsSection } from "@/components/admin/SubscriptionsSection";
import { AuditSection } from "@/components/admin/AuditSection";
import { HealthSection } from "@/components/admin/HealthSection";

type Tab = "overview" | "users" | "subscriptions" | "audit" | "health";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "概要", icon: "📊" },
  { key: "users", label: "ユーザー", icon: "👥" },
  { key: "subscriptions", label: "課金", icon: "💳" },
  { key: "audit", label: "ログ", icon: "📋" },
  { key: "health", label: "ヘルス", icon: "🔧" },
];

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  activeThisMonth: number;
  mrr: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const role = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      if (!res.ok) throw new Error("Failed");
      setStats(await res.json());
    } catch {
      setError("統計の取得に失敗しました");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadStats();
  }, [status, loadStats]);

  // Loading session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/30 text-sm">認証確認中...</p>
      </div>
    );
  }

  // Not logged in
  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-sm mb-4">ログインが必要です</p>
          <a href="/" className="text-cyan-400/60 text-sm hover:text-cyan-400/80">← ホームに戻る</a>
        </div>
      </div>
    );
  }

  // Not admin (client-side check + API check)
  if (authError || (role && role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <p className="text-white/50 text-sm mb-4">管理者権限がありません</p>
          <a href="/" className="text-cyan-400/60 text-sm hover:text-cyan-400/80">← ホームに戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-48 border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <h1 className="text-white/70 text-sm font-medium tracking-wider">Talk Trainer</h1>
          <p className="text-white/20 text-[10px] mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                tab === t.key
                  ? "bg-cyan-500/[0.08] text-cyan-300/80 border-r-2 border-cyan-400/50"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <p className="text-white/20 text-[10px] truncate">{session.user?.email}</p>
          <a href="/" className="text-white/25 text-[10px] hover:text-white/50 transition-colors">← アプリに戻る</a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {error && (
          <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-300/80 text-xs">{error}</p>
            <button onClick={() => setError(null)} className="text-red-300/50 text-[10px] mt-1 hover:text-red-300/80">✕ 閉じる</button>
          </div>
        )}

        {tab === "overview" && <OverviewSection stats={stats} loading={statsLoading} />}
        {tab === "users" && <UsersSection onError={setError} />}
        {tab === "subscriptions" && <SubscriptionsSection />}
        {tab === "audit" && <AuditSection />}
        {tab === "health" && <HealthSection />}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface HealthData {
  database: string;
  gemini: string;
  stripe: string;
  auth: string;
  timestamp: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "正常" },
  configured: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "設定済み" },
  missing: { bg: "bg-red-500/20", text: "text-red-300", label: "未設定" },
  error: { bg: "bg-red-500/20", text: "text-red-300", label: "エラー" },
};

const SERVICES = [
  { key: "database" as const, label: "データベース", icon: "🗄️" },
  { key: "gemini" as const, label: "Gemini API", icon: "🤖" },
  { key: "stripe" as const, label: "Stripe", icon: "💳" },
  { key: "auth" as const, label: "Google Auth", icon: "🔐" },
];

export function HealthSection() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetch("/api/admin/health")
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white/50 text-xs tracking-widest uppercase">システムヘルス</h2>
        <button
          onClick={refresh}
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          ↻ 更新
        </button>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm">チェック中...</p>
      ) : !health ? (
        <p className="text-red-300/60 text-sm">ヘルスチェックに失敗しました</p>
      ) : (
        <div className="space-y-3">
          {SERVICES.map((svc) => {
            const status = health[svc.key];
            const style = STATUS_STYLES[status] ?? STATUS_STYLES.error;
            return (
              <div key={svc.key} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{svc.icon}</span>
                  <span className="text-white/60 text-sm">{svc.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            );
          })}
          <p className="text-white/15 text-[10px] text-right mt-2">
            最終チェック: {new Date(health.timestamp).toLocaleString("ja-JP")}
          </p>
        </div>
      )}
    </div>
  );
}

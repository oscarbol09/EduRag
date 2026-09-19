"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PlatformStats {
  totalChatbots: number;
  totalTeachers: number;
  totalMessages: number;
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-xs font-semibold text-zinc-500 tracking-wide uppercase mt-1">
        {label}
      </span>
    </div>
  );
}

/**
 * Sección de estadísticas en tiempo real.
 * Separada como Client Component para preservar SSG en la landing (CRIT-01).
 */
export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    api.system.platformStats()
      .then((data) => setStats(data))
      .catch(() => null);
  }, []);

  return (
    <section className="bg-white border-y border-zinc-200/80 py-10 px-4 relative z-20">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
        <StatItem value={stats ? `${stats.totalChatbots}+` : "—"} label="Chatbots Creados" />
        <StatItem value={stats ? `${stats.totalTeachers}+` : "—"} label="Docentes Activos" />
        <StatItem value={stats ? `${stats.totalMessages.toLocaleString()}+` : "—"} label="Consultas Académicas" />
        <StatItem value="99.9%" label="Disponibilidad Cloud" />
      </div>
    </section>
  );
}


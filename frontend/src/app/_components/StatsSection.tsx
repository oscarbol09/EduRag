"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PlatformStats {
  totalChatbots: number;
  totalTeachers: number;
  totalMessages: number;
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center space-y-1">
      <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent font-display">
        {value}
      </div>
      <div className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
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
    fetch(`${API_URL}/platform/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => null);
  }, []);

  return (
    <section className="bg-white border-y border-gray-100 py-12 px-4 shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <StatItem value={stats ? `${stats.totalChatbots}+` : "—"} label="Chatbots Creados" />
        <StatItem value={stats ? `${stats.totalTeachers}+` : "—"} label="Docentes Activos" />
        <StatItem value={stats ? `${stats.totalMessages.toLocaleString()}+` : "—"} label="Mensajes Educativos" />
        <StatItem value="99.9%" label="Uptime en la Nube" />
      </div>
    </section>
  );
}

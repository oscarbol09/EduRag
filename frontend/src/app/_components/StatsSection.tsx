"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PlatformStats {
  totalChatbots: number;
  totalTeachers: number;
  totalMessages: number;
}

function StatItem({ value, label, subtitle }: { value: string; label: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-5 sm:p-6 text-center group">
      <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums font-display group-hover:text-cyan-300 transition-colors">
        {value}
      </span>
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mt-1.5">
        {label}
      </span>
      {subtitle && (
        <span className="text-[10px] font-mono text-slate-500 mt-0.5">
          {subtitle}
        </span>
      )}
    </div>
  );
}

/**
 * Sección de telemetría de plataforma en tiempo real.
 * Client Component aislado para preservar SSG en la landing page.
 */
export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    api.system.platformStats()
      .then((data) => setStats(data))
      .catch(() => null);
  }, []);

  return (
    <section className="glass-panel specular-highlight border-y border-white/10 py-4 px-4 relative z-20">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
        <StatItem 
          value={stats ? `${stats.totalChatbots}+` : "12+"} 
          label="Chatbots Creados" 
          subtitle="TUTORES CURRICULARES"
        />
        <StatItem 
          value={stats ? `${stats.totalTeachers}+` : "8+"} 
          label="Docentes Activos" 
          subtitle="CUENTAS AUTORIZADAS"
        />
        <StatItem 
          value={stats ? `${stats.totalMessages.toLocaleString()}+` : "1,450+"} 
          label="Consultas RAG" 
          subtitle="INTERACCIONES ACADÉMICAS"
        />
        <StatItem 
          value="99.9%" 
          label="Disponibilidad Cloud" 
          subtitle="SLA RAILWAY + VERCEL"
        />
      </div>
    </section>
  );
}

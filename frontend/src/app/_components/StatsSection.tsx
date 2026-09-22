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
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <span className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-xs sm:text-sm text-zinc-400 mt-1">
        {label}
      </span>
    </div>
  );
}

export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    api.system.platformStats()
      .then((data) => setStats(data))
      .catch(() => null);
  }, []);

  return (
    <section className="border-y border-zinc-800/80 bg-zinc-950/60 py-2">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60">
        <StatItem 
          value={stats ? `${stats.totalChatbots}+` : "12+"} 
          label="Tutores creados" 
        />
        <StatItem 
          value={stats ? `${stats.totalTeachers}+` : "8+"} 
          label="Docentes activos" 
        />
        <StatItem 
          value={stats ? `${stats.totalMessages.toLocaleString()}+` : "1,450+"} 
          label="Consultas realizadas" 
        />
        <StatItem 
          value="99.9%" 
          label="Disponibilidad" 
        />
      </div>
    </section>
  );
}

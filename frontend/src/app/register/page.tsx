"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { AuthLayout } from "@/components/AuthLayout";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { register } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password);
      router.push("/marketplace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar usuario");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Registro de Estudiante"
      subtitle="Accede al marketplace y consulta a los tutores inteligentes de tus asignaturas"
    >
      <div className="glass-panel rounded-xl border border-indigo-500/30 bg-indigo-950/30 text-slate-300 text-xs p-3.5 mb-5 leading-relaxed font-sans">
        <span className="font-bold text-indigo-300 block mb-0.5 font-display flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" />
          Aviso para Docentes e Investigadores:
        </span>
        El registro público habilita el rol de estudiante. Las credenciales docentes son aprovisionadas directamente por la administración institucional.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
            Correo institucional / personal
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 font-sans transition-all"
            placeholder="estudiante@universidad.edu"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 font-mono transition-all"
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 font-mono transition-all"
            placeholder="Repite la contraseña"
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div role="alert" className="text-rose-300 text-xs bg-rose-950/50 border border-rose-500/40 p-3 rounded-xl font-mono">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-press w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all inline-flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando cuenta de estudiante...
            </>
          ) : (
            "Crear Cuenta de Estudiante"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          ¿Ya tienes cuenta activa?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

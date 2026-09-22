"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { AuthLayout } from "@/components/AuthLayout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/marketplace");
      }
    } catch {
      setError("Credenciales inválidas. Verifica tu correo y contraseña.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Acceso al Sistema EduRAG"
      subtitle="Ingresa tus credenciales institucionales para acceder a tus tutores y cursos"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 font-sans transition-all"
            placeholder="usuario@universidad.edu"
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
            placeholder="••••••••••••"
            required
            autoComplete="current-password"
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
              Iniciando sesión...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors">
            Regístrate como estudiante
          </Link>
        </p>
      </div>

      {/* Institutional SSO */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 text-center mb-3">
          Autenticación Institucional Federada
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled
            title="Próximamente disponible vía protocolo OIDC"
            aria-label="Iniciar sesión con Google — próximamente disponible"
            className="flex-1 flex items-center justify-center gap-2 py-2 border border-white/10 rounded-xl opacity-40 cursor-not-allowed bg-white/[0.02] text-slate-400 text-xs font-mono"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Workspace
          </button>
          <button
            type="button"
            disabled
            title="Próximamente disponible vía Microsoft Entra ID"
            aria-label="Iniciar sesión con Microsoft — próximamente disponible"
            className="flex-1 flex items-center justify-center gap-2 py-2 border border-white/10 rounded-xl opacity-40 cursor-not-allowed bg-white/[0.02] text-slate-400 text-xs font-mono"
          >
            <svg className="w-3.5 h-3.5" fill="#00A4EF" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
            </svg>
            Microsoft 365
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

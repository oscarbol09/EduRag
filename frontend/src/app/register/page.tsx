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
      <div className="card-clean rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-300 text-xs p-3.5 mb-5 leading-relaxed">
        <span className="font-semibold text-zinc-200 block mb-0.5">
          Aviso para Docentes:
        </span>
        El registro público habilita el rol de estudiante. Las credenciales docentes son aprovisionadas directamente por la administración institucional.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-zinc-300 mb-1.5">
            Correo institucional o personal
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
            placeholder="estudiante@universidad.edu"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-zinc-300 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-mono transition-colors"
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-300 mb-1.5">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-mono transition-colors"
            placeholder="Repite la contraseña"
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div role="alert" className="text-rose-300 text-xs bg-rose-950/40 border border-rose-500/40 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-press w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm transition-colors inline-flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              Creando cuenta de estudiante...
            </>
          ) : (
            "Crear Cuenta de Estudiante"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-zinc-400">
          ¿Ya tienes cuenta activa?{" "}
          <Link href="/login" className="text-zinc-200 hover:text-white font-medium hover:underline transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

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
    <AuthLayout title="Crea tu cuenta de Estudiante">
      <div className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-lg p-3.5 mb-4 leading-relaxed">
        <span className="font-semibold text-zinc-900 block mb-0.5">Atención Docentes:</span>
        El registro público es exclusivo para estudiantes. Las cuentas docentes son habilitadas por el administrador de tu institución educativa.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 mb-1">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm transition-all text-zinc-900"
            placeholder="estudiante@universidad.edu"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm transition-all text-zinc-900"
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-zinc-700 mb-1">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm transition-all text-zinc-900"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div role="alert" className="text-red-700 text-xs bg-red-50 border border-red-200 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm btn-press shadow-sm transition-colors"
        >
          {isLoading ? "Creando cuenta..." : "Crear cuenta de estudiante"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-brand-600 hover:text-brand-700 font-semibold hover:underline transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}


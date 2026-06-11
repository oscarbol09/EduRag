"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import type { User } from "@/lib/types";

type UserRole = User["role"];

/**
 * Hook que centraliza el guard de autenticación y rol.
 * Reemplaza el bloque useEffect repetido en teacher/page, admin/page y futuros paneles.
 *
 * @param role - Rol requerido para acceder a la página
 * @returns isAuthorized (listo para renderizar) e isChecking (cargando)
 */
export function useRequireRole(role: UserRole): { isAuthorized: boolean; isChecking: boolean } {
  const { auth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.token) {
      router.push("/login");
      return;
    }

    if (auth.user && auth.user.role !== role) {
      if (auth.user.role === "admin") router.push("/admin");
      else if (auth.user.role === "teacher") router.push("/teacher");
      else router.push("/marketplace");
    }
  }, [auth.user, auth.token, auth.isLoading, role, router]);

  const isChecking = auth.isLoading || (!!auth.token && !auth.user);
  const isAuthorized = !isChecking && auth.user?.role === role;

  return { isAuthorized, isChecking };
}

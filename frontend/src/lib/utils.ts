import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { User } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Normaliza el campo `institution` del backend, que puede estar codificado
 * como "Nombre Apellido | Nombre Institución" (formato legado) o simplemente
 * como el nombre de la institución. Devuelve los campos separados.
 * Usar en cualquier componente que muestre datos de docentes (IMP-07).
 */
export function parseTeacherInstitution(teacher: Pick<User, "firstName" | "lastName" | "institution" | "institutionName">): {
  fullName: string;
  institutionName: string;
} {
  // Si el backend ya devuelve los campos separados, usarlos directamente
  if (teacher.firstName || teacher.lastName) {
    return {
      fullName: `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim(),
      institutionName: teacher.institutionName ?? teacher.institution ?? "Sin institución",
    };
  }

  // Formato legado: "Nombre Apellido | Institución"
  if (teacher.institution?.includes(" | ")) {
    const [namePart, instPart] = teacher.institution.split(" | ");
    return {
      fullName: namePart?.trim() ?? "",
      institutionName: instPart?.trim() ?? "Sin institución",
    };
  }

  return {
    fullName: "",
    institutionName: teacher.institution ?? "Sin institución",
  };
}

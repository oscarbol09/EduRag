"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ToastContainer, useToast } from "@/components/Toast";
import { parseTeacherInstitution } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function AdminPage() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    institution: "",
    country: "",
  });
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const router = useRouter();
  const { logout } = useApp();
  const { isChecking, isAuthorized } = useRequireRole("admin");
  const { toasts, toast, removeToast } = useToast();

  const loadTeachers = useCallback(async () => {
    try {
      const list = await api.admin.listTeachers();
      setTeachers(list);
    } catch {
      toast.error("No se pudo cargar la lista de docentes");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) {
      loadTeachers();
    }
  }, [isAuthorized, loadTeachers]);

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Spinner />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditClick = (teacher: User) => {
    const { fullName, institutionName } = parseTeacherInstitution(teacher);
    const [firstName = "", ...lastNameParts] = fullName.split(" ");
    setEditingTeacher(teacher);
    setFormData({
      firstName,
      lastName: lastNameParts.join(" "),
      email: teacher.email,
      password: "",
      institution: institutionName === "Sin institución" ? "" : institutionName,
      country: teacher.country ?? "",
    });
  };

  const handleCancelEdit = () => {
    setEditingTeacher(null);
    setFormData({ firstName: "", lastName: "", email: "", password: "", institution: "", country: "" });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.admin.deleteTeacher(deleteTarget);
      toast.success("Docente eliminado del sistema");
      if (editingTeacher?.id === deleteTarget) handleCancelEdit();
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar docente");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTeacher) {
        await api.admin.updateTeacher(editingTeacher.id, {
          email: formData.email,
          password: formData.password || undefined,
          firstName: formData.firstName.trim() || undefined,
          lastName: formData.lastName.trim() || undefined,
          institution: formData.institution.trim() || undefined,
          country: formData.country || undefined,
        });
        toast.success("Docente actualizado correctamente");
        setEditingTeacher(null);
      } else {
        if (!formData.password) throw new Error("La contraseña es obligatoria");
        await api.admin.createTeacher({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName.trim() || undefined,
          lastName: formData.lastName.trim() || undefined,
          institution: formData.institution.trim() || undefined,
          country: formData.country || undefined,
        });
        toast.success("Docente aprovisionado correctamente");
      }
      setFormData({ firstName: "", lastName: "", email: "", password: "", institution: "", country: "" });
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar docente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
      <Navbar
        variant="admin"
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/teacher"
              className="btn-press px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg font-medium text-xs transition-colors"
            >
              Panel Docente
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="btn-press px-2.5 py-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg font-medium text-xs transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
            Panel de Administración
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Aprovisionamiento y administración de cuentas docentes para universidades e instituciones educativas.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Formulario Crear/Editar (5 cols) */}
          <div className="lg:col-span-5 card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6 sm:p-7">
            <div className="flex justify-between items-center mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                {editingTeacher ? "Editar Credenciales Docente" : "Aprovisionar Nuevo Docente"}
              </h2>
              {editingTeacher && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-press text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-medium text-zinc-300 mb-1">Nombre *</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
                    placeholder="Ej: Laura"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-medium text-zinc-300 mb-1">Apellido *</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
                    placeholder="Ej: Gómez"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-xs font-medium text-zinc-300 mb-1">Correo Electrónico *</label>
                <input
                  id="adminEmail"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
                  placeholder="docente@universidad.edu"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-xs font-medium text-zinc-300 mb-1">
                  Contraseña {editingTeacher ? "(opcional)" : "*"}
                </label>
                <input
                  id="adminPassword"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder-zinc-500 font-mono transition-colors"
                  placeholder={editingTeacher ? "Dejar vacío para conservar" : "Mínimo 6 caracteres"}
                  required={!editingTeacher}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="institution" className="block text-xs font-medium text-zinc-300 mb-1">Institución Educativa *</label>
                <input
                  id="institution"
                  name="institution"
                  type="text"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
                  placeholder="Ej: Universidad Nacional"
                  required
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-xs font-medium text-zinc-300 mb-1">País</label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
                  placeholder="Ej: Colombia"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-press w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg disabled:opacity-50 font-medium text-xs transition-colors inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : editingTeacher ? (
                  "Actualizar Datos del Docente"
                ) : (
                  "Aprovisionar Docente"
                )}
              </button>
            </form>
          </div>

          {/* Listado de Docentes (7 cols) */}
          <div className="lg:col-span-7 card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6 sm:p-7 flex flex-col">
            <div className="flex items-center justify-between mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Docentes Registrados
              </h2>
              <span className="text-[11px] font-medium text-zinc-400 bg-zinc-950 px-2.5 py-0.5 rounded-md border border-zinc-800">
                {teachers.length} docentes activos
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs flex-1 flex items-center justify-center border border-zinc-800/60 rounded-lg bg-zinc-950/40">
                No hay docentes registrados en el sistema
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-auto max-h-[520px] pr-1">
                {teachers.map((teacher) => {
                  const { fullName, institutionName } = parseTeacherInstitution(teacher);
                  return (
                    <div
                      key={teacher.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950/60 rounded-lg border border-zinc-800/80 hover:border-zinc-700 transition-colors gap-3 group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-100 text-xs sm:text-sm">
                            {fullName || teacher.email}
                          </p>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                            teacher.is_active
                              ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-950/50 text-rose-300 border-rose-500/30"
                          }`}>
                            {teacher.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        {fullName && <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{teacher.email}</p>}
                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                          <span className="text-zinc-500">🏫</span>
                          {institutionName}{teacher.country ? ` · ${teacher.country}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                        <button
                          onClick={() => handleEditClick(teacher)}
                          className="btn-press px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteTarget(teacher.id)}
                          className="btn-press px-3 py-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 rounded-md border border-rose-500/30 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {deleteTarget && (() => {
        const teacher = teachers.find((t) => t.id === deleteTarget);
        const { fullName } = teacher ? parseTeacherInstitution(teacher) : { fullName: "" };
        return (
          <ConfirmModal
            isOpen
            title="¿Eliminar este docente del sistema?"
            description={`Se revocarán permanentemente el acceso y todos los recursos asociados a ${fullName || "este docente"}. Esta acción no se puede deshacer.`}
            confirmLabel="Sí, eliminar docente"
            cancelLabel="Cancelar"
            variant="danger"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        );
      })()}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

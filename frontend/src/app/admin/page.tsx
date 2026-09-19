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
    firstName: "", lastName: "", email: "", password: "", institution: "", country: "",
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
      toast.success("Docente eliminado correctamente");
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
        toast.success("Docente creado correctamente");
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        variant="admin"
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/teacher" className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-lg font-semibold text-xs transition-colors btn-press">
              Panel docente
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="px-2.5 py-1.5 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-display tracking-tight">Panel de Administración</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">Gestión institucional de docentes y control de acceso al sistema</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario crear/editar */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-zinc-950 font-display">
                {editingTeacher ? "Editar Docente" : "Crear Docente"}
              </h2>
              {editingTeacher && (
                <button type="button" onClick={handleCancelEdit} className="text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-md transition-colors">
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold text-zinc-700 mb-1">Nombre *</label>
                  <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all"
                    placeholder="Ej: Juan" required />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-semibold text-zinc-700 mb-1">Apellido *</label>
                  <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all"
                    placeholder="Ej: Pérez" required />
                </div>
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-xs font-semibold text-zinc-700 mb-1">Correo electrónico *</label>
                <input id="adminEmail" name="email" type="email" value={formData.email} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all"
                  placeholder="docente@universidad.edu" required autoComplete="off" />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-xs font-semibold text-zinc-700 mb-1">
                  Contraseña {editingTeacher ? "(dejar vacío para mantener)" : "*"}
                </label>
                <input id="adminPassword" name="password" type="password" value={formData.password} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all"
                  placeholder={editingTeacher ? "Nueva contraseña (opcional)" : "Contraseña inicial"}
                  required={!editingTeacher} autoComplete="new-password" />
              </div>

              <div>
                <label htmlFor="institution" className="block text-xs font-semibold text-zinc-700 mb-1">Institución educativa *</label>
                <input id="institution" name="institution" type="text" value={formData.institution} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all"
                  placeholder="Ej: Universidad Nacional" required />
              </div>

              <div>
                <label htmlFor="country" className="block text-xs font-semibold text-zinc-700 mb-1">País</label>
                <input id="country" name="country" type="text" value={formData.country} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all"
                  placeholder="Ej: Colombia" />
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg disabled:opacity-50 font-semibold text-xs shadow-sm btn-press transition-colors">
                {isSubmitting ? "Guardando..." : (editingTeacher ? "Actualizar docente" : "Crear docente")}
              </button>
            </form>
          </div>

          {/* Listado de docentes */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col">
            <h2 className="text-base font-bold text-zinc-950 font-display mb-4">Docentes Registrados ({teachers.length})</h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs flex-1 flex items-center justify-center">No hay docentes registrados</div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-auto max-h-[480px]">
                {teachers.map((teacher) => {
                  const { fullName, institutionName } = parseTeacherInstitution(teacher);
                  return (
                    <div key={teacher.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 gap-3">
                      <div>
                        <p className="font-bold text-zinc-900 text-xs sm:text-sm">{fullName || teacher.email}</p>
                        {fullName && <p className="text-[11px] text-zinc-500 mb-0.5">{teacher.email}</p>}
                        <p className="text-xs text-zinc-600">
                          {institutionName}{teacher.country ? ` · ${teacher.country}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${teacher.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                          {teacher.is_active ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => handleEditClick(teacher)}
                          className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-100 rounded-md border border-zinc-200 transition-colors btn-press"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteTarget(teacher.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors btn-press"
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
            title="¿Eliminar este docente?"
            description={`Se eliminarán permanentemente el acceso y los datos de ${fullName || "este docente"}. Esta acción no se puede deshacer.`}
            confirmLabel="Sí, eliminar"
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


"use client";

import { useEffect, useState } from "react";
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
  const { auth, logout } = useApp();
  const { isChecking, isAuthorized } = useRequireRole("admin");
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    if (isAuthorized) loadTeachers();
  }, [isAuthorized]);

  const loadTeachers = async () => {
    try {
      const list = await api.admin.listTeachers();
      setTeachers(list);
    } catch {
      toast.error("No se pudo cargar la lista de docentes");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    <div className="min-h-screen bg-gray-50 bg-dot-grid flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        variant="admin"
        actions={
          <div className="flex items-center gap-3.5">
            <Link href="/teacher" className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-brand-100">
              Panel docente
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 font-display">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona docentes y configura el sistema</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulario crear/editar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 font-display">
                {editingTeacher ? "Editar Docente" : "Crear Docente"}
              </h2>
              {editingTeacher && (
                <button type="button" onClick={handleCancelEdit} className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-xl transition-colors">
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                    placeholder="Ej: Juan" required />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                    placeholder="Ej: Pérez" required />
                </div>
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
                <input id="adminEmail" name="email" type="email" value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  placeholder="docente@universidad.edu" required autoComplete="off" />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editingTeacher ? "(dejar vacío para mantener)" : "*"}
                </label>
                <input id="adminPassword" name="password" type="password" value={formData.password} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  placeholder={editingTeacher ? "Nueva contraseña (opcional)" : "Contraseña inicial"}
                  required={!editingTeacher} autoComplete="new-password" />
              </div>

              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">Institución *</label>
                <input id="institution" name="institution" type="text" value={formData.institution} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  placeholder="Ej: Universidad de Córdoba" required />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <input id="country" name="country" type="text" value={formData.country} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  placeholder="Ej: Colombia" />
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 font-bold text-sm transition-all shadow-sm">
                {isSubmitting ? "Guardando..." : (editingTeacher ? "Actualizar docente" : "Crear docente")}
              </button>
            </form>
          </div>

          {/* Listado de docentes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 font-display mb-4">Docentes Registrados</h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No hay docentes registrados</div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => {
                  const { fullName, institutionName } = parseTeacherInstitution(teacher);
                  return (
                    <div key={teacher.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 gap-3">
                      <div>
                        <p className="font-bold text-gray-900">{fullName || teacher.email}</p>
                        {fullName && <p className="text-xs text-gray-500 mb-1">{teacher.email}</p>}
                        <p className="text-sm text-gray-600">
                          🏫 {institutionName}{teacher.country ? ` · 📍 ${teacher.country}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${teacher.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                          {teacher.is_active ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => handleEditClick(teacher)}
                          className="px-3 py-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-100/50 transition-colors shadow-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteTarget(teacher.id)}
                          className="px-3 py-1.5 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100/50 transition-colors shadow-sm"
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

      {/* Modal de confirmación — reemplaza confirm() nativo (CRIT-02) */}
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

      {/* Sistema de toasts — reemplaza alert() nativo (CRIT-02) */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

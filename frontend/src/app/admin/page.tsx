"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { Navbar } from "@/components/Navbar";
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
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { auth, logout } = useApp();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.token) {
        router.push("/login");
      } else if (auth.user) {
        if (auth.user.role !== "admin") {
          if (auth.user.role === "teacher") {
            router.push("/teacher");
          } else {
            router.push("/marketplace");
          }
        } else {
          loadTeachers();
        }
      }
    }
  }, [auth.user, auth.token, auth.isLoading]);

  const loadTeachers = async () => {
    try {
      const list = await api.admin.listTeachers();
      setTeachers(list);
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (auth.isLoading || (auth.token && !auth.user) || !auth.user || auth.user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditClick = (teacher: User) => {
    let firstName = "";
    let lastName = "";
    let institution = teacher.institution || "";
    
    if (institution.includes(" | ")) {
      const parts = institution.split(" | ");
      const fullName = parts[0] || "";
      institution = parts[1] || "";
      
      const nameParts = fullName.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }
    
    setEditingTeacher(teacher);
    setFormData({
      firstName,
      lastName,
      email: teacher.email,
      password: "",
      institution,
      country: teacher.country || "",
    });
    setMessage("");
  };

  const handleCancelEdit = () => {
    setEditingTeacher(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      institution: "",
      country: "",
    });
    setMessage("");
  };

  const handleDeleteClick = async (teacherId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este docente? Se borrarán permanentemente sus accesos.")) return;
    try {
      await api.admin.deleteTeacher(teacherId);
      setMessage("Docente eliminado exitosamente");
      if (editingTeacher?.id === teacherId) {
        handleCancelEdit();
      }
      await loadTeachers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al eliminar docente");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

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
        setMessage("Docente actualizado exitosamente");
        setEditingTeacher(null);
      } else {
        if (!formData.password) {
          throw new Error("La contraseña es obligatoria para crear un nuevo docente");
        }
        await api.admin.createTeacher({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName.trim() || undefined,
          lastName: formData.lastName.trim() || undefined,
          institution: formData.institution.trim() || undefined,
          country: formData.country || undefined,
        });
        setMessage("Docente creado exitosamente");
      }
      setFormData({ firstName: "", lastName: "", email: "", password: "", institution: "", country: "" });
      await loadTeachers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al procesar docente");
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
            <Link
              href="/teacher"
              className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-brand-100"
            >
              Panel docente
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600">Gestiona docentes y configura el sistema</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTeacher ? "Editar Docente" : "Crear Docente"}
              </h2>
              {editingTeacher && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg"
                >
                  Cancelar
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                    placeholder="Ej: Juan"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                    placeholder="Ej: Pérez"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  placeholder="docente@universidad.edu"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editingTeacher ? "(dejar en blanco para mantener actual)" : "*"}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  placeholder={editingTeacher ? "Nueva contraseña opcional" : "Defina una contraseña"}
                  required={!editingTeacher}
                />
              </div>

              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
                  Institución *
                </label>
                <input
                  id="institution"
                  name="institution"
                  type="text"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all"
                  placeholder="Ej: Universidad de Córdoba"
                  required
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all"
                  placeholder="Ej: Argentina"
                />
              </div>

              {message && (
                <div className={`text-sm p-3 rounded-xl ${message.includes("Error") || message.includes("obligatoria") ? "text-red-600 bg-red-50 border border-red-100" : "text-green-600 bg-green-50 border border-green-100"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 font-bold text-sm transition-all shadow-sm"
              >
                {isSubmitting ? "Guardando..." : (editingTeacher ? "Actualizar docente" : "Crear docente")}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Docentes Registrados</h2>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay docentes registrados
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => {
                  let fullName = "";
                  let displayInst = "Sin institución";
                  if (teacher.firstName || teacher.lastName) {
                    fullName = `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
                  }
                  if (teacher.institutionName) {
                    displayInst = teacher.institutionName;
                  } else if (teacher.institution) {
                    if (teacher.institution.includes(" | ")) {
                      const parts = teacher.institution.split(" | ");
                      fullName = fullName || parts[0];
                      displayInst = parts[1] || "Sin institución";
                    } else {
                      displayInst = teacher.institution;
                    }
                  }

                  return (
                    <div key={teacher.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          {fullName || teacher.email}
                        </p>
                        {fullName && (
                          <p className="text-xs text-gray-500 mb-1">{teacher.email}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          🏫 {displayInst} {teacher.country ? `· 📍 ${teacher.country}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${teacher.is_active ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
                          {teacher.is_active ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => handleEditClick(teacher)}
                          className="px-3 py-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-100/50 transition-colors shadow-sm"
                          title="Editar Docente"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(teacher.id)}
                          className="px-3 py-1.5 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100/50 transition-colors shadow-sm"
                          title="Eliminar Docente"
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
    </div>
  );
}
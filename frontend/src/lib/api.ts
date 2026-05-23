import type {
  User,
  Chatbot,
  Document,
  Conversation,
  ChatMessage,
  ChatResponse,
  CreateChatbotData,
  CreateTeacherData
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    me: () => fetchApi<User>("/auth/me"),
    login: (email: string, password: string) =>
      fetchApi<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string) =>
      fetchApi<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "student" }),
      }),
  },

  chatbots: {
    list: (ownerId?: string) =>
      fetchApi<Chatbot[]>(
        ownerId ? `/chatbots?owner_id=${ownerId}` : "/chatbots"
      ),
    get: (id: string) => fetchApi<Chatbot>(`/chatbots/${id}`),
    create: (data: CreateChatbotData) =>
      fetchApi<Chatbot>("/chatbots", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Chatbot>) =>
      fetchApi<Chatbot>(`/chatbots/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/chatbots/${id}`, { method: "DELETE" }),
    publish: (id: string) =>
      fetchApi<Chatbot>(`/chatbots/${id}/publish`, { method: "POST" }),
    getEmbed: (id: string) =>
      fetchApi<{ embed_code: string; public_url: string }>(
        `/chatbots/${id}/embed`
      ),
  },

  documents: {
    upload: async (chatbotId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatbot_id", chatbotId);

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Error al subir archivo" }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json();
    },
    list: (chatbotId: string) =>
      fetchApi<Document[]>(`/documents?chatbot_id=${chatbotId}`),
    get: (id: string) => fetchApi<Document>(`/documents/${id}`),
    delete: (id: string, chatbotId: string) =>
      fetchApi<void>(`/documents/${id}?chatbot_id=${chatbotId}`, { method: "DELETE" }),
  },

  chat: {
    send: (chatbotId: string, message: ChatMessage) =>
      fetchApi<ChatResponse>(`/chat/${chatbotId}`, {
        method: "POST",
        body: JSON.stringify(message),
      }),
    history: (chatbotId: string, conversationId: string) =>
      fetchApi<Conversation>(
        `/chat/${chatbotId}/history?conversation_id=${conversationId}`
      ),
  },

  admin: {
    createTeacher: (data: CreateTeacherData) =>
      fetchApi<User>("/admin/teachers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listTeachers: () => fetchApi<User[]>("/admin/teachers"),
  },

  system: {
    health: () => fetchApi<{ status: string }>("/health"),
    ready: () => fetchApi<{ status: string }>("/ready"),
  },
};

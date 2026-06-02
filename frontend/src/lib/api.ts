import type {
  User,
  Chatbot,
  Document,
  Conversation,
  ChatMessage,
  ChatResponse,
  CreateChatbotData,
  CreateTeacherData,
  UpdateTeacherData,
  UpdateProfileData
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Timeout por defecto para llamadas no streaming (ms).
const DEFAULT_TIMEOUT_MS = 120_000;
// Timeout para llamadas livianas (auth, listados, CRUD ligero).
const LIGHT_TIMEOUT_MS = 30_000;

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = LIGHT_TIMEOUT_MS
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("La solicitud tardó demasiado y fue cancelada. Intenta de nuevo.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface StreamCallbacks {
  onToken: (chunk: string) => void;
  onDone: (meta: { conversation_id: string; sources: string[]; cached: boolean }) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

async function streamChat(
  chatbotId: string,
  message: ChatMessage,
  callbacks: StreamCallbacks
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/chat/${chatbotId}/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
    signal: callbacks.signal,
  });

  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parsear eventos SSE separados por "\n\n".
    let sepIdx: number;
    while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);

      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (dataLines.length === 0) continue;

      let payload: { content?: string; conversation_id?: string; sources?: string[]; cached?: boolean; message?: string };
      try {
        payload = JSON.parse(dataLines.join("\n"));
      } catch {
        continue;
      }

      if (eventName === "token" && typeof payload.content === "string") {
        callbacks.onToken(payload.content);
      } else if (eventName === "done") {
        callbacks.onDone({
          conversation_id: payload.conversation_id || "",
          sources: payload.sources || [],
          cached: Boolean(payload.cached),
        });
      } else if (eventName === "error") {
        callbacks.onError?.(payload.message || "Error desconocido");
      }
    }
  }
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
    updateProfile: (data: UpdateProfileData) =>
      fetchApi<User>("/auth/me/profile", {
        method: "PUT",
        body: JSON.stringify(data),
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      try {
        const response = await fetch(`${API_URL}/documents/upload`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: "Error al subir archivo" }));
          throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          throw new Error("La subida del archivo tardó demasiado y fue cancelada.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    list: (chatbotId: string) =>
      fetchApi<Document[]>(`/documents?chatbot_id=${chatbotId}`),
    get: (id: string) => fetchApi<Document>(`/documents/${id}`),
    delete: (id: string, chatbotId: string) =>
      fetchApi<void>(`/documents/${id}?chatbot_id=${chatbotId}`, { method: "DELETE" }),
  },

  chat: {
    send: (chatbotId: string, message: ChatMessage) =>
      fetchApi<ChatResponse>(
        `/chat/${chatbotId}`,
        {
          method: "POST",
          body: JSON.stringify(message),
        },
        DEFAULT_TIMEOUT_MS
      ),
    sendStream: (chatbotId: string, message: ChatMessage, callbacks: StreamCallbacks) =>
      streamChat(chatbotId, message, callbacks),
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
    updateTeacher: (id: string, data: UpdateTeacherData) =>
      fetchApi<User>(`/admin/teachers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteTeacher: (id: string) =>
      fetchApi<{ detail: string }>(`/admin/teachers/${id}`, {
        method: "DELETE",
      }),
  },

  teacher: {
    getMetrics: () => fetchApi<{
      totalChatbots: number;
      publishedChatbots: number;
      totalDocuments: number;
      weeklyConversations: number;
      channelStatus: string;
    }>("/teacher/metrics"),
  },

  system: {
    health: () => fetchApi<{ status: string }>("/health"),
    ready: () => fetchApi<{ status: string }>("/ready"),
  },
};

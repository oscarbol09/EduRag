"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "./api";
import type { User, Chatbot, Conversation } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AppState {
  auth: AuthState;
  chatbots: Chatbot[];
  currentChatbot: Chatbot | null;
  conversations: Record<string, Conversation>;
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => void;
  loadChatbots: () => Promise<void>;
  setCurrentChatbot: (chatbot: Chatbot | null) => void;
  refreshChatbot: (id: string) => Promise<void>;
  updateUser: (user: User) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
    isLoading: false,
  });

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [currentChatbot, setCurrentChatbot] = useState<Chatbot | null>(null);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});

  useEffect(() => {
    async function loadUser() {
      if (auth.token && !auth.user) {
        setAuth((prev) => ({ ...prev, isLoading: true }));
        try {
          const user = await api.auth.me();
          setAuth({ user, token: auth.token, isLoading: false });
        } catch (error) {
          console.error("Failed to auto-load user from token:", error);
          localStorage.removeItem("token");
          setAuth({ user: null, token: null, isLoading: false });
        }
      }
    }
    loadUser();
  }, [auth.token]);

  const login = useCallback(async (email: string, password: string) => {
    setAuth((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await api.auth.login(email, password);
      localStorage.setItem("token", result.token);
      setAuth({ user: result.user, token: result.token, isLoading: false });
      return result.user;
    } catch (error) {
      setAuth((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setAuth((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await api.auth.register(email, password);
      localStorage.setItem("token", result.token);
      setAuth({ user: result.user, token: result.token, isLoading: false });
      return result.user;
    } catch (error) {
      setAuth((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setAuth({ user: null, token: null, isLoading: false });
    setChatbots([]);
    setCurrentChatbot(null);
    setConversations({});
  }, []);

  const loadChatbots = useCallback(async () => {
    if (!auth.token) return;
    try {
      const list = await api.chatbots.list();
      setChatbots(list);
    } catch (error) {
      console.error("Failed to load chatbots:", error);
    }
  }, [auth.token]);

  const refreshChatbot = useCallback(
    async (id: string) => {
      try {
        const updated = await api.chatbots.get(id);
        setChatbots((prev) =>
          prev.map((cb) => (cb.id === id ? updated : cb))
        );
        if (currentChatbot?.id === id) {
          setCurrentChatbot(updated);
        }
      } catch (error) {
        console.error("Failed to refresh chatbot:", error);
      }
    },
    [currentChatbot]
  );

  const updateUser = useCallback((user: User) => {
    setAuth((prev) => ({ ...prev, user }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        auth,
        chatbots,
        currentChatbot,
        conversations,
        login,
        register,
        logout,
        loadChatbots,
        setCurrentChatbot,
        refreshChatbot,
        updateUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}

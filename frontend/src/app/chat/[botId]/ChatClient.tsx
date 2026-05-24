"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ChatMessage, ChatResponse, Message, Chatbot } from "@/lib/types";

function renderMessageContent(content: string, isUser: boolean) {
  if (!content) return null;
  
  // Escapar HTML básico para XSS
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Bold: **text** -> <strong>text</strong>
  const boldClass = isUser ? "font-extrabold text-white" : "font-extrabold text-gray-900";
  html = html.replace(/\*\*(.*?)\*\*/g, `<strong class="${boldClass}">$1</strong>`);
  
  // Italics: *text* -> <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  
  // Code: `code` -> <code>code</code>
  const codeClass = isUser ? "bg-brand-700 px-1 py-0.5 rounded font-mono text-xs text-white" : "bg-gray-100 px-1 py-0.5 rounded font-mono text-xs text-brand-700";
  html = html.replace(/`(.*?)`/g, `<code class="${codeClass}">$1</code>`);
  
  return <span className="whitespace-pre-wrap text-sm leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ChatClient() {
  const { botId } = useParams();
  const router = useRouter();

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detectar si hay un token → el docente está probando su bot
  const isTeacherPreview =
    typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar datos del chatbot para mostrar el nombre en el header
  useEffect(() => {
    if (!botId) return;
    api.chatbots.get(botId as string).then(setChatbot).catch(() => null);
  }, [botId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date().toISOString() },
    ]);

    try {
      const response: ChatResponse = await api.chat.send(botId as string, {
        message: userMessage,
        conversation_id: conversationId || undefined,
      });

      setConversationId(response.conversation_id);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.response,
          timestamp: new Date().toISOString(),
          sources: response.sources,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const chatbotName = chatbot?.name || "Chatbot Educativo";

  return (
    <div className="min-h-screen bg-gray-50 bg-dot-grid flex flex-col">
      {/* Header con navegación */}
      <header className="bg-white shadow-sm py-3 px-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Botón volver */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          {/* Nombre del chatbot */}
          <div className="flex-1 text-center">
            <h1 className="text-base font-semibold text-gray-900 truncate">{chatbotName}</h1>
            {chatbot?.subject_area && (
              <p className="text-xs text-gray-400">{chatbot.subject_area}</p>
            )}
          </div>

          {/* Botón Publicar (solo visible para el docente en preview) */}
          {isTeacherPreview && chatbot && (
            <button
              onClick={() => {
                api.chatbots.publish(botId as string).then(() => router.back());
              }}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                  chatbot.is_published
                    ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
                disabled={chatbot.is_published}
            >
              {chatbot.is_published ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Publicado
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Publicar
                </>
              )}
            </button>
          )}

          {/* Placeholder para mantener el layout centrado cuando no hay botón de publicar */}
          {!isTeacherPreview && <div className="w-20" />}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 overflow-auto">
        <div className="bg-white rounded-xl shadow h-full flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
          {/* Mensaje de bienvenida */}
          {chatbot?.welcome_message && messages.length === 0 && (
            <div className="px-6 pt-6 pb-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                {chatbot.welcome_message}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-base font-semibold text-gray-600">Envía un mensaje para comenzar</p>
                <p className="text-sm text-gray-400 mt-1.5">El asistente responderá basándose en los documentos cargados por tu docente</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200/40"
                    }`}
                  >
                    {renderMessageContent(msg.content, msg.role === "user")}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-gray-200/50 pt-2">
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100/50 select-none shadow-sm hover:shadow transition-shadow"
                          >
                            📄 {src}
                          </span>
                        ))}
                      </div>
                    )}
                    <p
                      className={`text-[10px] mt-1.5 ${
                        msg.role === "user" ? "text-brand-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="border-t p-4 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
            >
              Enviar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

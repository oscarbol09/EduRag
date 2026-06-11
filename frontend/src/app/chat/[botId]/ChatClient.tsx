"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { ChatMessage, ChatResponse, Message, Chatbot } from "@/lib/types";

function renderMessageContent(content: string, isUser: boolean) {
  if (!content) return null;

  const boldClass = isUser ? "font-extrabold text-white" : "font-extrabold text-gray-900";
  const codeInlineClass = isUser
    ? "bg-brand-700 px-1 py-0.5 rounded font-mono text-xs text-white"
    : "bg-gray-100 px-1 py-0.5 rounded font-mono text-xs text-brand-700";

  // Dividir por bloques de código triple backtick primero
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g;
  const segments: { type: "code_block" | "text"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code_block", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  const renderTextSegment = (text: string, segKey: number) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        return (
          <div key={`${segKey}-line-${lineIdx}`} className="flex gap-2 my-0.5">
            <span className={isUser ? "text-brand-200" : "text-gray-400"}>{"•"}</span>
            <span>{renderInline(listMatch[3], `${segKey}-li-${lineIdx}`)}</span>
          </div>
        );
      }
      return (
        <span key={`${segKey}-line-${lineIdx}`}>
          {renderInline(line, `${segKey}-${lineIdx}`)}
          {lineIdx < lines.length - 1 && "\n"}
        </span>
      );
    });
  };

  const renderInline = (text: string, keyPrefix: string) => {
    const regex = /(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={`${keyPrefix}-${index}`} className={codeInlineClass}>{part.slice(1, -1)}</code>;
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${keyPrefix}-${index}`} className={boldClass}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={`${keyPrefix}-${index}`} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
      {segments.map((seg, i) =>
        seg.type === "code_block" ? (
          <pre
            key={i}
            className="my-2 p-3 bg-gray-800 text-green-300 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre"
          >
            {seg.content}
          </pre>
        ) : (
          <span key={i}>{renderTextSegment(seg.content, i)}</span>
        )
      )}
    </span>
  );
}

export default function ChatClient() {
  const { botId } = useParams();
  const router = useRouter();

  // CRIT-04: detectar rol via contexto de autenticación, no via sessionStorage
  const { auth } = useApp();
  const isTeacherPreview = auth.user?.role === "teacher";

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref que almacena el ID único del mensaje placeholder del assistant activo.
  // Usar un ref en lugar de calcular messages.length evita el race condition de React batching.
  const assistantMsgIdRef = useRef<string | null>(null);

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

    const userMsgObj: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Generar un ID único y estable para el placeholder del assistant.
    // Se usa un ref para que appendToAssistant/replaceAssistant siempre lean el valor correcto
    // independientemente de qué renders de React estén pendientes (evita el bug de batching).
    const assistantMsgId = crypto.randomUUID();
    assistantMsgIdRef.current = assistantMsgId;

    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsgObj, assistantPlaceholder]);

    const appendToAssistant = (chunk: string) => {
      const targetId = assistantMsgIdRef.current;
      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findIndex((m) => m.id === targetId);
        if (idx !== -1 && next[idx].role === "assistant") {
          next[idx] = { ...next[idx], content: next[idx].content + chunk };
        }
        return next;
      });
    };

    const replaceAssistant = (content: string, sources?: string[]) => {
      const targetId = assistantMsgIdRef.current;
      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findIndex((m) => m.id === targetId);
        if (idx !== -1 && next[idx].role === "assistant") {
          next[idx] = {
            ...next[idx],
            content,
            sources: sources ?? next[idx].sources,
            timestamp: new Date().toISOString(),
          };
        }
        return next;
      });
    };

    try {
      let receivedAny = false;
      await api.chat.sendStream(
        botId as string,
        { message: userMessage, conversation_id: conversationId || undefined },
        {
          onToken: (chunk) => {
            receivedAny = true;
            appendToAssistant(chunk);
          },
          onDone: ({ conversation_id, sources }) => {
            if (conversation_id) setConversationId(conversation_id);
            const targetId = assistantMsgIdRef.current;
            setMessages((prev) => {
              const next = [...prev];
              const idx = next.findIndex((m) => m.id === targetId);
              if (idx !== -1 && next[idx].role === "assistant") {
                next[idx] = { ...next[idx], sources };
              }
              return next;
            });
          },
          onError: (msg) => {
            replaceAssistant(msg);
          },
        }
      );

      // Fallback: si el stream no entregó tokens, usar el endpoint sin streaming.
      if (!receivedAny) {
        const response: ChatResponse = await api.chat.send(botId as string, {
          message: userMessage,
          conversation_id: conversationId || undefined,
        });
        setConversationId(response.conversation_id);
        replaceAssistant(response.response, response.sources);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Fallback final: intentar el endpoint sin streaming.
      try {
        const response: ChatResponse = await api.chat.send(botId as string, {
          message: userMessage,
          conversation_id: conversationId || undefined,
        });
        setConversationId(response.conversation_id);
        replaceAssistant(response.response, response.sources);
      } catch {
        replaceAssistant("Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo.");
      }
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
            aria-label="Volver a la página anterior"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
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

          {/* Botón Publicar — visible solo para docentes en preview (CRIT-04: via contexto) */}
          {isTeacherPreview && chatbot ? (
            <button
              onClick={() => {
                api.chatbots.publish(botId as string).then(() => router.back());
              }}
              disabled={chatbot.is_published}
              aria-label={chatbot.is_published ? "Chatbot ya publicado" : "Publicar este chatbot"}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                chatbot.is_published
                  ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              {chatbot.is_published ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Publicado
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Publicar
                </>
              )}
            </button>
          ) : (
            /* Placeholder para mantener el layout centrado cuando no hay botón de publicar */
            <div className="w-20" aria-hidden="true" />
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 overflow-auto">
        <div className="bg-white rounded-xl shadow h-full flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
          {/* Mensaje de bienvenida */}
          {chatbot?.welcome_message && messages.length === 0 && (
            <div className="px-6 pt-6 pb-2">
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-800">
                {chatbot.welcome_message}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-6 space-y-4" role="log" aria-label="Mensajes del chat" aria-live="polite">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <div className="text-5xl mb-4" aria-hidden="true">💬</div>
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
                    {msg.role === "assistant" && !msg.content ? (
                      <div className="flex gap-1.5 items-center h-4" aria-label="El asistente está escribiendo">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      renderMessageContent(msg.content, msg.role === "user")
                    )}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-gray-200/50 pt-2" aria-label="Fuentes citadas">
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100/50 select-none shadow-sm hover:shadow transition-shadow"
                          >
                            <span aria-hidden="true">📄</span> {src}
                          </span>
                        ))}
                      </div>
                    )}
                    <p
                      className={`text-[10px] mt-1.5 ${
                        msg.role === "user" ? "text-brand-200" : "text-gray-400"
                      }`}
                      aria-label={`Enviado a las ${new Date(msg.timestamp).toLocaleTimeString()}`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="border-t p-4 flex gap-3">
            <label htmlFor="chat-input" className="sr-only">Escribe tu mensaje</label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
              disabled={isLoading}
              maxLength={4000}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
              aria-label="Enviar mensaje"
            >
              Enviar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

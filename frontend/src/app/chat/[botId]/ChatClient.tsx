"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { ChatResponse, Message, Chatbot } from "@/lib/types";

function renderMessageContent(content: string, isUser: boolean) {
  if (!content) return null;

  const boldClass = isUser ? "font-bold text-white" : "font-semibold text-zinc-100";
  const codeInlineClass = "bg-zinc-800/80 px-1.5 py-0.5 rounded font-mono text-xs text-zinc-200 border border-zinc-700/50";
  const mathInlineClass = "bg-zinc-850 px-1.5 py-0.5 rounded font-mono text-xs text-zinc-200 border border-zinc-700/50 italic";

  // Dividir por bloques: triple backtick (código) o $$...$$ / \[...\] (matemática display)
  const blockRegex = /(```[\w]*\n?[\s\S]*?```|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g;
  const segments: { type: "code_block" | "math_block" | "text"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("```")) {
      const inner = raw.replace(/^```[\w]*\n?/, "").replace(/```$/, "").trim();
      segments.push({ type: "code_block", content: inner });
    } else if (raw.startsWith("$$")) {
      const inner = raw.slice(2, -2).trim();
      segments.push({ type: "math_block", content: inner });
    } else if (raw.startsWith("\\[")) {
      const inner = raw.slice(2, -2).trim();
      segments.push({ type: "math_block", content: inner });
    }
    lastIndex = match.index + raw.length;
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
          <div key={`${segKey}-line-${lineIdx}`} className="flex gap-2 my-1.5 items-start">
            <span className="text-zinc-400 select-none text-xs">
              {listMatch[2].endsWith(".") ? listMatch[2] : "•"}
            </span>
            <span className="flex-1">{renderInline(listMatch[3], `${segKey}-li-${lineIdx}`)}</span>
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
    const regex = /(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*]+\*|\\\([^\n\\]+\\\)|\$[^\n$]+\$)/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={`${keyPrefix}-${index}`} className={codeInlineClass}>{part.slice(1, -1)}</code>;
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${keyPrefix}-${index}`} className={boldClass}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={`${keyPrefix}-${index}`} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("\\(") && part.endsWith("\\)")) {
        return <span key={`${keyPrefix}-${index}`} className={mathInlineClass}>{part.slice(2, -2)}</span>;
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return <span key={`${keyPrefix}-${index}`} className={mathInlineClass}>{part.slice(1, -1)}</span>;
      }
      return part;
    });
  };

  return (
    <span className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-sans">
      {segments.map((seg, i) => {
        if (seg.type === "code_block") {
          return (
            <pre
              key={i}
              className="my-3 p-3.5 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre leading-normal"
            >
              <code>{seg.content}</code>
            </pre>
          );
        }
        if (seg.type === "math_block") {
          return (
            <div
              key={i}
              className="my-3 p-3.5 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-mono overflow-x-auto text-center font-medium italic select-all"
              aria-label="Fórmula matemática display"
            >
              {seg.content}
            </div>
          );
        }
        return <span key={i}>{renderTextSegment(seg.content, i)}</span>;
      })}
    </span>
  );
}

export default function ChatClient() {
  const { botId } = useParams();
  const router = useRouter();

  const { auth } = useApp();
  const isTeacherPreview = auth.user?.role === "teacher";

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantMsgIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      // Fallback: si el stream no entregó tokens, usar el endpoint sin streaming
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
      try {
        const response: ChatResponse = await api.chat.send(botId as string, {
          message: userMessage,
          conversation_id: conversationId || undefined,
        });
        setConversationId(response.conversation_id);
        replaceAssistant(response.response, response.sources);
      } catch {
        replaceAssistant("Lo siento, ocurrió una interrupción al procesar la consulta curricular. Por favor intenta de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const chatbotName = chatbot?.name || "Asistente Pedagógico";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 py-3 px-4 sm:px-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="btn-press flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 transition-colors"
            aria-label="Volver a la página anterior"
          >
            <span aria-hidden="true">←</span>
            <span>Volver</span>
          </button>

          <div className="flex-1 text-center min-w-0">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
              <h1 className="text-sm font-semibold text-zinc-100 truncate">{chatbotName}</h1>
            </div>
            {chatbot?.subject_area && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {chatbot.subject_area} {chatbot.education_level && `· ${chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}`}
              </p>
            )}
          </div>

          {isTeacherPreview && chatbot ? (
            <button
              onClick={() => {
                api.chatbots.publish(botId as string).then(() => router.back());
              }}
              disabled={chatbot.is_published}
              aria-label={chatbot.is_published ? "Chatbot ya publicado" : "Publicar este chatbot"}
              className={`btn-press flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                chatbot.is_published
                  ? "bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-default"
                  : "bg-zinc-100 hover:bg-white text-zinc-900 shadow-sm"
              }`}
            >
              {chatbot.is_published ? "Publicado" : "Publicar"}
            </button>
          ) : (
            <div className="w-16" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-between overflow-hidden">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col justify-between overflow-hidden shadow-xl min-h-[calc(100vh-140px)]">
          {/* Welcome directive banner */}
          {chatbot?.welcome_message && messages.length === 0 && (
            <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-300 shrink-0 font-medium">
                  i
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-300 block mb-0.5">
                    Mensaje del Tutor
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{chatbot.welcome_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Messages Log */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4" role="log" aria-label="Mensajes del chat" aria-live="polite">
            {messages.length === 0 ? (
              <div className="text-center py-16 px-4 max-w-md mx-auto space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Inicia la consulta académica</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Formula tus preguntas sobre el material del curso. Las explicaciones se basan estrictamente en los documentos curriculares cargados por el docente.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 sm:p-5 ${
                      msg.role === "user"
                        ? "bg-zinc-800 text-zinc-100 rounded-tr-sm border border-zinc-700"
                        : "bg-zinc-950/90 text-zinc-200 rounded-tl-sm border border-zinc-800"
                    }`}
                  >
                    {msg.role === "assistant" && !msg.content ? (
                      <div className="flex gap-2 items-center h-5 py-1" aria-label="El asistente está escribiendo">
                        <span className="text-xs text-zinc-400">Generando respuesta...</span>
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      renderMessageContent(msg.content, msg.role === "user")
                    )}

                    {/* Cited sources */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-1.5 items-center" aria-label="Fuentes citadas">
                        <span className="text-[11px] text-zinc-500 mr-1">Fuentes:</span>
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 select-none"
                          >
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span className="truncate max-w-[220px]">{src}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <p
                      className={`text-[10px] tabular-nums mt-2 text-right ${
                        msg.role === "user" ? "text-zinc-400" : "text-zinc-500"
                      }`}
                      aria-label={`Enviado a las ${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Bar */}
          <form onSubmit={handleSend} className="border-t border-zinc-800/80 p-3 sm:p-4 flex gap-2.5 bg-zinc-950/70 rounded-b-2xl">
            <label htmlFor="chat-input" className="sr-only">Escribe tu consulta</label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta académica sobre los apuntes de clase..."
              className="flex-1 px-4 py-2.5 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-800 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700 rounded-xl outline-none text-xs sm:text-sm transition-all"
              disabled={isLoading}
              maxLength={4000}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-press px-4 sm:px-5 py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-zinc-900 rounded-xl font-medium text-xs sm:text-sm transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
              aria-label="Enviar mensaje"
            >
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

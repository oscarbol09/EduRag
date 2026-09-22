"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import type { ChatResponse, Message, Chatbot } from "@/lib/types";

function renderMessageContent(content: string, isUser: boolean) {
  if (!content) return null;

  const boldClass = isUser ? "font-bold text-white" : "font-semibold text-white";
  const codeInlineClass = isUser
    ? "bg-indigo-900/80 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-200 border border-indigo-400/40"
    : "bg-[#07080c] px-1.5 py-0.5 rounded font-mono text-xs text-cyan-300 border border-white/10";
  const mathInlineClass = isUser
    ? "bg-indigo-950/90 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300 border border-amber-500/30 italic"
    : "bg-amber-950/60 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300 border border-amber-500/40 italic";

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
            <span className={isUser ? "text-indigo-300 select-none font-mono text-xs" : "text-cyan-400 select-none font-mono text-xs"}>
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
              className="my-3 p-3.5 bg-[#050608] text-cyan-300 border border-white/10 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre leading-normal shadow-inner"
            >
              <code>{seg.content}</code>
            </pre>
          );
        }
        if (seg.type === "math_block") {
          return (
            <div
              key={i}
              className="my-3 p-3.5 bg-amber-950/40 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-mono overflow-x-auto text-center font-medium italic select-all shadow-sm"
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
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header con navegación de Terminal */}
      <header className="glass-panel specular-highlight border-b border-white/10 py-3 px-4 sm:px-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="btn-press flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            aria-label="Volver a la página anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Volver</span>
          </button>

          <div className="flex-1 text-center min-w-0">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 led-pulse" aria-hidden="true" />
              <h1 className="text-sm font-bold text-white truncate font-display">{chatbotName}</h1>
            </div>
            {chatbot?.subject_area && (
              <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider truncate mt-0.5">
                {chatbot.subject_area} {chatbot.education_level && `// ${chatbot.education_level.toUpperCase()}`}
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
              className={`btn-press flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                chatbot.is_published
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 cursor-default"
                  : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-950/40 border border-indigo-400/30"
              }`}
            >
              {chatbot.is_published ? "Publicado" : "Publicar"}
            </button>
          ) : (
            <div className="w-16" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* Main Terminal Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-between overflow-hidden">
        <div className="glass-panel specular-highlight rounded-2xl border border-white/10 flex-1 flex flex-col justify-between overflow-hidden shadow-2xl min-h-[calc(100vh-140px)]">
          {/* Welcome directive banner */}
          {chatbot?.welcome_message && messages.length === 0 && (
            <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 to-transparent">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 block mb-0.5">
                    Directiva Pedagógica del Docente
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{chatbot.welcome_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Messages Log */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4" role="log" aria-label="Mensajes del chat" aria-live="polite">
            {messages.length === 0 ? (
              <div className="text-center py-16 px-4 max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white font-display">Inicia la consulta académica</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Formula tus dudas sobre el material de estudio. Las respuestas son sintetizadas con estricta trazabilidad de fuentes a partir de los documentos provistos por el docente.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 sm:p-5 shadow-lg ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-xs border border-indigo-400/30"
                        : "glass-card text-slate-100 rounded-bl-xs border border-white/10"
                    }`}
                  >
                    {msg.role === "assistant" && !msg.content ? (
                      <div className="flex gap-2 items-center h-5 py-1" aria-label="El asistente está escribiendo">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Sintetizando</span>
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      renderMessageContent(msg.content, msg.role === "user")
                    )}

                    {/* Cited sources */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5 items-center" aria-label="Fuentes citadas">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">Fuentes:</span>
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#07080c] text-cyan-300 border border-white/10 select-none"
                          >
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            <span className="truncate max-w-[220px]">{src}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <p
                      className={`text-[10px] font-mono tabular-nums mt-2 text-right ${
                        msg.role === "user" ? "text-indigo-200" : "text-slate-500"
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

          {/* Form Input Terminal */}
          <form onSubmit={handleSend} className="border-t border-white/10 p-3 sm:p-4 flex gap-2.5 bg-[#07080c]/80 rounded-b-2xl">
            <label htmlFor="chat-input" className="sr-only">Escribe tu consulta</label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta académica o pide una explicación paso a paso..."
              className="flex-1 px-4 py-2.5 bg-white/[0.04] text-slate-100 placeholder:text-slate-500 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-xl outline-none text-xs sm:text-sm transition-all"
              disabled={isLoading}
              maxLength={4000}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-press px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-950/50 border border-indigo-400/30 flex items-center gap-1.5 shrink-0"
              aria-label="Enviar mensaje"
            >
              <span>Consultar</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9-7-9-7v5H4v4h8v5z" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  usedTools?: boolean;
  toolStatus?: string;
}

function renderMarkdown(text: string) {
  // Minimal markdown: bold and inline code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="text-xs bg-brand-cream-warm px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

interface DashboardChatProps {
  userRole: string;
  userName: string;
}

const EXAMPLE_PROMPTS = [
  { label: "SOD Conflicts", text: "What are the unresolved critical SOD conflicts?" },
  { label: "Mapping Progress", text: "Show me the current mapping progress by department" },
  { label: "Risk Summary", text: "What are the biggest risks in this migration?" },
  { label: "Next Steps", text: "What should I focus on next to move this project forward?" },
];

export function DashboardChat({ userRole, userName }: DashboardChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const initials = userName
    ? userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          context: { page: "/dashboard", userRole, userName },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Sorry, I encountered an error: ${err.error || "Something went wrong."}`,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;
          const payload = trimmedLine.slice(6);
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.tool_status) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, toolStatus: parsed.tool_status, usedTools: true };
                return updated;
              });
            }
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + parsed.text, toolStatus: undefined };
                return updated;
              });
            }
            if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: `Sorry, something went wrong: ${parsed.error}` };
                return updated;
              });
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't reach Lumen. Please try again." };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, userRole, userName]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-border/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-teal-400 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-medium text-brand-text">Lumen</span>
          <span className="text-[10px] text-brand-text-light ml-2">AI Assistant</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-6 space-y-4 max-h-[420px] min-h-[280px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[240px] space-y-5">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-brand-text">Hi {userName || "there"}! I&apos;m Lumen.</p>
              <p className="text-xs text-brand-text-muted">Ask me anything about your migration project.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => { setInput(prompt.text); }}
                  className="text-left px-3 py-2.5 rounded-xl border border-brand-border/60 bg-white/40 hover:bg-white/80 hover:border-brand-accent/30 transition-all group"
                >
                  <span className="text-[11px] font-medium text-brand-accent group-hover:text-brand-accent-dark block">{prompt.label}</span>
                  <span className="text-[10px] text-brand-text-muted leading-snug line-clamp-2">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="flex gap-3">
              {msg.role === "assistant" ? (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-accent to-teal-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-cream-warm flex items-center justify-center text-[10px] font-bold text-brand-text-muted shrink-0">
                  {initials}
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-4 py-3 max-w-[85%]",
                msg.role === "user"
                  ? "bg-brand-cream-warm rounded-tl-sm"
                  : "glass-card rounded-tl-sm"
              )}>
                {msg.toolStatus && !msg.content ? (
                  <span className="inline-flex items-center gap-1 text-xs text-brand-accent">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {msg.toolStatus}
                  </span>
                ) : msg.content ? (
                  <div className="text-sm text-brand-text leading-relaxed">
                    {renderMarkdown(msg.content)}
                    {msg.usedTools && msg.role === "assistant" && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-accent opacity-70 ml-2">
                        <Database className="h-2.5 w-2.5" />
                        Used tools
                      </span>
                    )}
                  </div>
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin text-brand-accent" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-border bg-white/60">
          <input
            type="text"
            placeholder="Ask Lumen about your migration..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-text-light focus:outline-none"
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-white hover:bg-brand-accent-dark transition-colors disabled:opacity-40"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

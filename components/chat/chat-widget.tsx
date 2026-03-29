"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Lightweight inline markdown: **bold**, *italic*, `code`, and newlines */
function renderMarkdown(text: string) {
  // Split into paragraphs on double newlines
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    // Split each paragraph into lines
    const lines = para.split("\n");
    return (
      <p key={pi} className={pi > 0 ? "mt-2" : undefined}>
        {lines.map((line, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderInline(line)}
          </span>
        ))}
      </p>
    );
  });
}

function renderInline(text: string) {
  // Match **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-slate-200 px-1 py-0.5 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface ChatWidgetProps {
  userRole: string;
  userName: string;
}

function getWelcomeMessage(userName: string, userRole: string): string {
  const firstName = userName.split(" ")[0];
  switch (userRole) {
    case "system_admin":
    case "admin":
      return `Hello ${firstName}! I can help you manage the platform, configure settings, review mapping progress, or troubleshoot issues. What do you need?`;
    case "approver":
      return `Hello ${firstName}! I can help you review pending approvals, understand SOD conflicts, or navigate mapping decisions. How can I assist?`;
    case "coordinator":
      return `Hello ${firstName}! I can help you track mapping progress across your area, manage assignments, or review status. What would you like to know?`;
    case "mapper":
      return `Hello ${firstName}! I can help you with role mapping, persona analysis, or understanding target roles. What are you working on?`;
    default:
      return `Hello ${firstName}! I'm the Lumen. I can help you navigate the platform and understand role mapping data. How can I help?`;
  }
}

export function ChatWidget({ userRole, userName }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const abortRef = useRef<AbortController | null>(null);

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: "assistant", content: getWelcomeMessage(userName, userRole) },
      ]);
    }
  }, [userName, userRole, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleNewChat = useCallback(() => {
    // Abort any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setInput("");
    setMessages([
      { role: "assistant", content: getWelcomeMessage(userName, userRole) },
    ]);
  }, [userName, userRole]);

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Add placeholder for assistant response
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
          context: { page: pathname, userRole, userName },
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
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.text,
                };
                return updated;
              });
            }
            if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `Sorry, something went wrong: ${parsed.error}`,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Sorry, I couldn't reach Lumen. Please try again.",
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, pathname, userRole, userName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center",
          "rounded-full bg-teal-500 text-white shadow-lg",
          "transition-all duration-200 hover:bg-teal-600 hover:shadow-xl hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Open Lumen assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 flex flex-col",
          "w-[400px] bg-white shadow-2xl border-l-4 border-l-teal-500 border-t border-t-slate-200",
          "transition-all duration-300 ease-in-out",
          isOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        )}
        style={{ height: "calc(100vh - 64px)", top: "64px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Lumen</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">
              {navigator?.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+K
            </span>
            <button
              onClick={handleNewChat}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="New chat"
              title="New Chat"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-indigo-50 text-slate-700"
                    : "bg-teal-50 text-slate-700"
                )}
              >
                {msg.content ? (
                  renderMarkdown(msg.content)
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Lumen about this project..."
              disabled={isStreaming}
              className={cn(
                "flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
                "placeholder:text-slate-400",
                "focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                "bg-teal-500 text-white transition-colors",
                "hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
              )}
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

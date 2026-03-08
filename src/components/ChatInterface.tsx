import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ChatMessage } from "@/lib/streamChat";
import { compressImage } from "@/lib/imageUtils";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { Send, Loader2, Mic, MicOff, Plus, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Did I eat enough protein today?",
  "Should I work out tonight?",
  "What should I eat for dinner?",
  "Give me a 30-min dumbbell workout",
];

type Props = {
  conversationId: string | null;
  onFirstMessage?: (text: string) => void;
  autoSend?: string | null;
  onAutoSendComplete?: () => void;
};

const ChatInterface = ({ conversationId, onFirstMessage, autoSend, onAutoSendComplete }: Props) => {
  const { session, user } = useAuth();
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "there";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setMessages([]);
    setHistoryLoaded(false);
    if (!conversationId) { setHistoryLoaded(true); return; }

    supabase
      .from("chat_messages")
      .select("role, content, images, created_at")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            images: m.images?.length ? m.images : undefined,
          })));
        }
        setHistoryLoaded(true);
      });
  }, [user, conversationId]);

  const saveMessage = useCallback(async (msg: ChatMessage) => {
    if (!user || !conversationId) return;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      images: msg.images || [],
      conversation_id: conversationId,
    });
  }, [user, conversationId]);

  const handleVoiceResult = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
    inputRef.current?.focus();
  }, []);

  const { isRecording, start: startRecording, stop: stopRecording, isSupported: voiceSupported } =
    useVoiceRecording(handleVoiceResult);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Auto-send a message when autoSend prop is provided
  useEffect(() => {
    if (!autoSend || !historyLoaded || !conversationId || isLoading) return;
    send(autoSend);
    onAutoSendComplete?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, historyLoaded, conversationId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 3 - pendingImages.length;
    if (remaining <= 0) { toast.error("Maximum 3 images per message"); return; }
    try {
      const compressed = await Promise.all(Array.from(files).slice(0, remaining).map((f) => compressImage(f)));
      setPendingImages((prev) => [...prev, ...compressed]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process image");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const send = async (text: string, images?: string[]) => {
    const hasContent = text.trim() || images?.length;
    if (!hasContent || isLoading || !session?.access_token || !conversationId) return;

    if (messages.length === 0 && text.trim() && onFirstMessage) onFirstMessage(text.trim());

    const userMsg: ChatMessage = {
      role: "user",
      content: text.trim() || (images?.length ? "What's in this image?" : ""),
      images: images?.length ? images : undefined,
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);
    saveMessage(userMsg);

    let assistantContent = "";
    try {
      await streamChat({
        messages: updatedMessages,
        accessToken: session.access_token,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
            }
            return [...prev, { role: "assistant", content: assistantContent }];
          });
        },
        onDone: () => {
          setIsLoading(false);
          if (assistantContent) saveMessage({ role: "assistant", content: assistantContent });
        },
        onError: (error) => { toast.error(error); setIsLoading(false); },
      });
    } catch {
      toast.error("Failed to connect to your wellness coach");
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input, pendingImages.length > 0 ? pendingImages : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, pendingImages.length > 0 ? pendingImages : undefined); }
  };

  if (!conversationId) return null;

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Message history ─────────────────────────────────────── */}
      <div ref={scrollRef} className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
        {!historyLoaded ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">Ask your AI wellness coach anything</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-metric-ai/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] text-metric-ai font-bold">AI</span>
                </div>
              )}
              <div className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}>
                {msg.images?.map((img, j) => (
                  <img key={j} src={img} alt="Attached" className="rounded-lg max-h-32 max-w-[140px] object-cover mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ))}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content && <span>{msg.content}</span>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2 items-center pl-8">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-metric-ai animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-metric-ai animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-metric-ai animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Pending image previews ───────────────────────────────── */}
      {pendingImages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {pendingImages.map((img, i) => (
            <div key={i} className="relative group">
              <div className="h-14 w-14 rounded-xl border border-border bg-secondary overflow-hidden">
                <img src={img} alt="Preview" className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <button
                onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────── */}
      <div className="surface-elevated p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening…" : "Ask your wellness coach…"}
            disabled={isLoading}
            rows={2}
            className={`w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed ${
              isRecording ? "text-metric-ai" : ""
            }`}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="flex items-center gap-1">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                    isRecording
                      ? "bg-metric-ai/15 text-metric-ai animate-mic-pulse"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;

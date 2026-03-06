import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ChatMessage } from "@/lib/streamChat";
import { compressImage } from "@/lib/imageUtils";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
};

const ChatInterface = ({ conversationId, onFirstMessage }: Props) => {
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

  // Load chat history when conversationId changes
  useEffect(() => {
    if (!user) return;
    setMessages([]);
    setHistoryLoaded(false);

    if (!conversationId) {
      setHistoryLoaded(true);
      return;
    }

    const loadHistory = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content, images, created_at")
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data && data.length > 0) {
        setMessages(
          data.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            images: m.images && m.images.length > 0 ? m.images : undefined,
          }))
        );
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  }, [user, conversationId]);

  const saveMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!user || !conversationId) return;
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: msg.role,
        content: msg.content,
        images: msg.images || [],
        conversation_id: conversationId,
      });
    },
    [user, conversationId]
  );

  const handleVoiceResult = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
    inputRef.current?.focus();
  }, []);

  const { isRecording, start: startRecording, stop: stopRecording, isSupported: voiceSupported } =
    useVoiceRecording(handleVoiceResult);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const maxImages = 3;
    const remaining = maxImages - pendingImages.length;
    if (remaining <= 0) {
      toast.error("Maximum 3 images per message");
      return;
    }
    const toProcess = Array.from(files).slice(0, remaining);
    try {
      const compressed = await Promise.all(toProcess.map((f) => compressImage(f)));
      setPendingImages((prev) => [...prev, ...compressed]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process image");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const send = async (text: string, images?: string[]) => {
    const hasContent = text.trim() || (images && images.length > 0);
    if (!hasContent || isLoading || !session?.access_token || !conversationId) return;

    // Auto-title on first message
    if (messages.length === 0 && text.trim() && onFirstMessage) {
      onFirstMessage(text.trim());
    }

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

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: updatedMessages,
        accessToken: session.access_token,
        onDelta: upsertAssistant,
        onDone: () => {
          setIsLoading(false);
          if (assistantContent) {
            saveMessage({ role: "assistant", content: assistantContent });
          }
        },
        onError: (error) => {
          toast.error(error);
          setIsLoading(false);
        },
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input, pendingImages.length > 0 ? pendingImages : undefined);
    }
  };

  const isEmpty = messages.length === 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
        <h2 className="text-lg font-semibold text-muted-foreground">Select or start a chat</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-8">
            <h2 className="text-2xl font-bold tracking-tight">
              {getGreeting()}, {firstName}
            </h2>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {msg.images.map((img, j) => (
                      <img key={j} src={img} alt="Uploaded food" className="rounded-lg max-h-32 max-w-[140px] object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ))}
                  </div>
                )}
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
          <div className="flex gap-2 items-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {pendingImages.length > 0 && (
        <div className="flex gap-2 flex-wrap px-1 pb-2">
          {pendingImages.map((img, i) => (
            <div key={i} className="relative group">
              <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                <img src={img} alt="Preview" className="h-full w-full object-cover"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.innerHTML += '<span class="text-[10px] text-muted-foreground text-center px-1">Image attached</span>';
                  }} />
              </div>
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Card className="flex-shrink-0 border-border/50 shadow-sm">
        <CardContent className="p-3">
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "How can I help you today?"}
              disabled={isLoading}
              rows={2}
              className={`w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none ${
                isRecording ? "animate-pulse" : ""
              }`}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  <Plus className="h-4 w-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </div>
              <div className="flex items-center gap-1">
                {voiceSupported && (
                  <Button type="button" size="icon" variant={isRecording ? "destructive" : "ghost"} className="h-8 w-8 text-muted-foreground" onClick={isRecording ? stopRecording : startRecording} disabled={isLoading}>
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                <Button type="submit" size="icon" className="h-8 w-8" disabled={(!input.trim() && pendingImages.length === 0) || isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;

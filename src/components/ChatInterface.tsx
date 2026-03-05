import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat, type ChatMessage } from "@/lib/streamChat";
import { compressImage } from "@/lib/imageUtils";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Send, Loader2, User, Bot, Mic, MicOff, Camera, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Did I eat enough protein today?",
  "Should I work out tonight?",
  "What should I eat for dinner?",
  "Give me a 30-min dumbbell workout",
];

const ChatInterface = () => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      toast.error("Failed to process image");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const send = async (text: string, images?: string[]) => {
    const hasContent = text.trim() || (images && images.length > 0);
    if (!hasContent || isLoading || !session?.access_token) return;

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
        onDone: () => setIsLoading(false),
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

  const isEmpty = messages.length === 0;

  return (
    <Card className="flex flex-col overflow-hidden border-primary/10" style={{ height: "min(600px, 65vh)" }}>
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Wellness Coach
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 overflow-hidden p-4 pt-0 gap-3">
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Log meals & activity by text, voice, or photo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tell me what you ate or how you worked out — I'll log everything and estimate macros and calories burned.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
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
                {msg.role === "assistant" && (
                  <div className="rounded-full bg-primary/10 p-1.5 h-7 w-7 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {/* Show images if present */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {msg.images.map((img, j) => (
                        <img
                          key={j}
                          src={img}
                          alt="Uploaded food"
                          className="rounded-lg max-h-32 max-w-[140px] object-cover"
                        />
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
                {msg.role === "user" && (
                  <div className="rounded-full bg-foreground/10 p-1.5 h-7 w-7 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 items-center">
              <div className="rounded-full bg-primary/10 p-1.5 h-7 w-7 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Image previews */}
        {pendingImages.length > 0 && (
          <div className="flex gap-2 flex-wrap px-1">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
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

        {/* Input row */}
        <form onSubmit={handleSubmit} className="flex gap-1.5 flex-shrink-0 items-center">
          {/* Voice button */}
          {voiceSupported && (
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              className="flex-shrink-0 h-9 w-9"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Image button */}
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="flex-shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Text input */}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Describe your meal or snap a photo..."}
            disabled={isLoading}
            className={`flex-1 h-9 ${isRecording ? "border-destructive/50 animate-pulse" : ""}`}
          />

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            className="flex-shrink-0 h-9 w-9"
            disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;

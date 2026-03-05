import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/components/chat/ConversationList";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const convs = (data || []) as Conversation[];
      setConversations(convs);

      // Auto-select the most recent conversation, or create one
      if (convs.length > 0) {
        setActiveId(convs[0].id);
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const createConversation = useCallback(
    async (title = "New Chat") => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title })
        .select("id, title, created_at, updated_at")
        .single();
      if (error || !data) return null;
      const conv = data as Conversation;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      return conv.id;
    },
    [user]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await supabase.from("chat_conversations").delete().eq("id", id);
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeId]
  );

  const renameConversation = useCallback(async (id: string, title: string) => {
    await supabase.from("chat_conversations").update({ title }).eq("id", id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  // Auto-title a conversation based on first user message
  const autoTitle = useCallback(
    async (id: string, firstMessage: string) => {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "…" : "");
      await renameConversation(id, title);
    },
    [renameConversation]
  );

  const touchConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx <= 0) return prev;
      const updated = [...prev];
      const [conv] = updated.splice(idx, 1);
      return [{ ...conv, updated_at: new Date().toISOString() }, ...updated];
    });
  }, []);

  return {
    conversations,
    activeId,
    setActiveId,
    loaded,
    createConversation,
    deleteConversation,
    renameConversation,
    autoTitle,
    touchConversation,
  };
}

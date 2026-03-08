import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type StravaStatus = "loading" | "connected" | "disconnected";

export function useStravaIntegration() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StravaStatus>("loading");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("integrations")
      .select("status, last_sync_at")
      .eq("user_id", user.id)
      .eq("provider", "strava")
      .maybeSingle();
    setStatus(data?.status === "connected" ? "connected" : "disconnected");
    setLastSyncAt(data?.last_sync_at ?? null);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "strava-connected") {
        setStatus("connected");
        toast.success("Strava connected! Syncing activities…");
        refresh();
        runSync();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [refresh]);

  const connect = useCallback(async (returnTo = window.location.pathname) => {
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("strava-auth", {
      body: { userId: user.id, origin: window.location.origin, returnTo },
    });

    if (error || !data?.url) {
      let msg = data?.error || "Unknown error";
      if (error?.context) {
        try { const body = await error.context.json(); msg = body?.error || body?.message || msg; } catch {}
      } else if (error?.message) {
        msg = error.message;
      }
      toast.error(`Strava connection failed: ${msg}`);
      return;
    }

    const popup = window.open(data.url, "strava-oauth", "width=520,height=640,left=200,top=100");
    if (!popup) { window.location.href = data.url; return; }

    const interval = setInterval(async () => {
      if (popup.closed) {
        clearInterval(interval);
        await refresh();
        const { data: row } = await supabase
          .from("integrations")
          .select("status")
          .eq("user_id", user!.id)
          .eq("provider", "strava")
          .maybeSingle();
        if (row?.status === "connected") {
          setStatus("connected");
          toast.success("Strava connected! Syncing activities…");
          await runSync();
        }
      }
    }, 600);
  }, [user, refresh]);

  const runSync = useCallback(async (onSuccess?: () => void) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("strava-sync", {
        body: { userId: user?.id },
      });
      if (error) {
        let msg = "Strava sync failed";
        if (error.context) {
          try { const body = await error.context.json(); msg = body?.error || body?.message || msg; } catch {}
        } else if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
          msg = error.message;
        }
        throw new Error(msg);
      }
      const count = data?.imported ?? 0;
      toast.success(
        count > 0
          ? `Imported ${count} activit${count !== 1 ? "ies" : "y"} from Strava`
          : "No new activities found"
      );
      setLastSyncAt(new Date().toISOString());
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Strava sync failed");
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const sync = useCallback(async (onSuccess?: () => void) => {
    if (status !== "connected") return;
    await runSync(onSuccess);
  }, [status, runSync]);

  const disconnect = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("integrations")
      .update({ status: "disconnected", access_token: null, refresh_token: null })
      .eq("user_id", user.id)
      .eq("provider", "strava");
    setStatus("disconnected");
    toast.success("Strava disconnected");
  }, [user]);

  return { status, syncing, lastSyncAt, connect, sync, disconnect, refresh };
}

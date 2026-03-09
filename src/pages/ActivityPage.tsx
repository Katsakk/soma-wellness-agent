import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dumbbell, RefreshCw, Clock, Flame, Trash2, Loader2, Send, Plus, Mic, MicOff, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import WeeklyActivityView from "@/components/activity/WeeklyActivityView";
import MonthlyActivityView from "@/components/activity/MonthlyActivityView";
import SyncWorkoutsDialog from "@/components/activity/SyncWorkoutsDialog";
import TodayActivitySummary from "@/components/activity/TodayActivitySummary";

interface Workout {
  id: string;
  name: string;
  workout_type: string | null;
  duration: number | null;
  calories_burned: number | null;
  completed_at: string | null;
  created_at: string;
  source: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  cardio:     "Cardio",
  strength:   "Strength",
  flexibility:"Flexibility",
  sports:     "Sports",
  hiit:       "HIIT",
  full_body:  "Full Body",
  upper_body: "Upper Body",
  lower_body: "Lower Body",
  other:      "General",
};

const ACTIVITY_SUGGESTIONS = [
  "30 min run",
  "45 min HIIT class",
  "1 hour gym session",
  "20 min yoga",
  "45 min cycling",
  "30 min swim",
  "Upper body weights",
  "Lower body strength",
];

interface WorkoutEstimate {
  name: string;
  workout_type: string;
  duration_minutes: number;
  calories_burned: number;
}

const ActivityPage = () => {
  const { user } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [allWorkouts, setAllWorkouts]     = useState<Workout[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState("today");
  const [syncOpen, setSyncOpen]           = useState(false);
  const [logOpen, setLogOpen]             = useState(false);
  const [logText, setLogText]             = useState("");
  const [estimating, setEstimating]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [estimate, setEstimate]           = useState<WorkoutEstimate | null>(null);
  const [pendingImage, setPendingImage]   = useState<string | null>(null);
  const logTextareaRef                    = useRef<HTMLTextAreaElement>(null);
  const activityFileInputRef              = useRef<HTMLInputElement>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setLogText((prev) => (prev ? prev + " " + text : text));
    logTextareaRef.current?.focus();
  }, []);
  const { isRecording, start: startRecording, stop: stopRecording, isSupported: voiceSupported } =
    useVoiceRecording(handleVoiceResult);

  const handleActivityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
    } catch {
      toast.error("Failed to process image");
    }
    if (activityFileInputRef.current) activityFileInputRef.current.value = "";
  };

  const fetchWorkouts = async () => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const historyStart = subDays(new Date(), 90);

    const [todayRes, allRes] = await Promise.all([
      // Today: strict window so past-dated synced workouts don't bleed in
      supabase.from("workouts").select("*").eq("user_id", user.id)
        .gte("completed_at", todayStart.toISOString())
        .lte("completed_at", todayEnd.toISOString())
        .order("completed_at", { ascending: false }),
      // Weekly/monthly: 90 days back + all future (no upper bound) so upcoming Gmail bookings show
      supabase.from("workouts").select("*").eq("user_id", user.id)
        .gte("completed_at", historyStart.toISOString()).order("completed_at", { ascending: false }),
    ]);

    setTodayWorkouts(todayRes.data || []);
    setAllWorkouts(allRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWorkouts(); }, [user]);

  // Handle OAuth popup callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected" && window.opener) {
      window.opener.postMessage({ type: "gmail-connected" }, window.location.origin);
      window.close();
    }
    if (params.get("strava") === "connected" && window.opener) {
      window.opener.postMessage({ type: "strava-connected" }, window.location.origin);
      window.close();
    }
  }, []);

  const handleEstimateWorkout = async (text?: string, img = pendingImage) => {
    const input = (text ?? logText).trim();
    if (!input && !img) return;
    if (!estimate) setLogText(text ?? logText);
    setEstimating(true);
    setEstimate(null);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-workout", {
        body: { description: input || undefined, image: img || undefined },
      });
      if (error) throw new Error(error.message);
      setEstimate(data as WorkoutEstimate);
    } catch (e: any) {
      toast.error(e.message || "Failed to estimate workout");
    } finally {
      setEstimating(false);
    }
  };

  const handleSaveWorkout = async () => {
    if (!estimate || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("workouts").insert({
        user_id: user.id,
        name: estimate.name,
        workout_type: estimate.workout_type,
        duration: estimate.duration_minutes,
        calories_burned: estimate.calories_burned,
        source: "manual",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      toast.success("Workout logged!");
      setLogOpen(false);
      setLogText("");
      setEstimate(null);
      setPendingImage(null);
      fetchWorkouts();
    } catch (e: any) {
      toast.error(e.message || "Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleLogKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEstimateWorkout();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete workout");
    } else {
      setTodayWorkouts((prev) => prev.filter((w) => w.id !== id));
      setAllWorkouts((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workout deleted");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6 pb-32">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Workouts and exercise history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Sync
          </Button>
          <Button size="sm" onClick={() => setLogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Log activity
          </Button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today"   className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="weekly"  className="flex-1">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
        </TabsList>

        {/* ── Today ─────────────────────────────────────────────── */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayWorkouts.length === 0 ? (
            <div className="surface-elevated flex flex-col items-center justify-center py-16 text-center px-6">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ backgroundColor: "hsl(var(--metric-activity) / 0.12)" }}
              >
                <Dumbbell className="h-6 w-6" style={{ color: "hsl(var(--metric-activity))" }} />
              </div>
              <h3 className="font-semibold text-foreground">No workouts yet</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Tell your wellness coach about a workout or sync from an app
              </p>
            </div>
          ) : (
            <>
              <TodayActivitySummary workouts={todayWorkouts} />
              <div className="space-y-2">
                {todayWorkouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Weekly ────────────────────────────────────────────── */}
        <TabsContent value="weekly" className="mt-4">
          {loading
            ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : <WeeklyActivityView workouts={allWorkouts} />}
        </TabsContent>

        {/* ── Monthly ───────────────────────────────────────────── */}
        <TabsContent value="monthly" className="mt-4">
          {loading
            ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : <MonthlyActivityView workouts={allWorkouts} />}
        </TabsContent>
      </Tabs>

      <SyncWorkoutsDialog open={syncOpen} onOpenChange={setSyncOpen} onSynced={fetchWorkouts} />

      {/* ── Log Activity Dialog ────────────────────────────────── */}
      <Dialog open={logOpen} onOpenChange={(o) => { setLogOpen(o); if (!o) { setLogText(""); setEstimate(null); setPendingImage(null); } }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/60" style={{ background: "hsl(var(--surface-base))" }}>
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-base font-semibold">Log activity</DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-5 space-y-4 mt-4">
            {/* Suggestion chips */}
            {!estimate && (
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleEstimateWorkout(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Chat-style input */}
            {!estimate && (
              <div className="surface-elevated p-3 space-y-2">
                {pendingImage && (
                  <div className="relative inline-block">
                    <div className="h-16 w-16 rounded-xl border border-border overflow-hidden">
                      <img src={pendingImage} alt="Activity" className="h-full w-full object-cover" />
                    </div>
                    <button
                      onClick={() => setPendingImage(null)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <textarea
                  ref={logTextareaRef}
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  onKeyDown={handleLogKeyDown}
                  placeholder="Describe your workout… e.g. 45 min run at 5k pace"
                  rows={2}
                  className={`w-full bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground/60 leading-relaxed ${isRecording ? "text-primary" : ""}`}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => activityFileInputRef.current?.click()}
                      disabled={estimating}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <input
                      ref={activityFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleActivityImageUpload}
                    />
                    {voiceSupported && (
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={estimating}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                          isRecording
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleEstimateWorkout()}
                    disabled={(!logText.trim() && !pendingImage) || estimating}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                  >
                    {estimating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Estimate result */}
            {estimating && !estimate && (
              <div className="surface-elevated p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Estimating…
              </div>
            )}

            {estimate && (
              <div className="space-y-3">
                <div className="surface-elevated p-4 space-y-3">
                  <p className="font-semibold text-sm">{estimate.name}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Type", value: TYPE_LABELS[estimate.workout_type] ?? estimate.workout_type, token: "--metric-activity" },
                      { label: "Duration", value: `${estimate.duration_minutes} min`, token: "--metric-activity" },
                      { label: "Calories", value: `${estimate.calories_burned} kcal`, token: "--metric-calories" },
                    ].map(({ label, value, token }) => (
                      <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: `hsl(var(${token}) / 0.1)` }}>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-sm font-semibold" style={{ color: `hsl(var(${token}))` }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEstimate(null); setLogText(""); }}
                    className="flex-1 py-2 text-sm text-muted-foreground border border-border/60 rounded-xl hover:border-border transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleSaveWorkout}
                    disabled={saving}
                    className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save workout
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Workout card ──────────────────────────────────────────────────────────────

function WorkoutCard({ workout: w, onDelete }: { workout: Workout; onDelete: (id: string) => void }) {
  const typeLabel = TYPE_LABELS[w.workout_type || "other"] ?? TYPE_LABELS.other;

  return (
    <div className="surface-elevated p-4 flex items-center justify-between group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ backgroundColor: "hsl(var(--metric-activity) / 0.12)" }}
        >
          <Dumbbell className="h-4 w-4" style={{ color: "hsl(var(--metric-activity))" }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm text-foreground truncate">{w.name}</p>
            {w.source === "strava" && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 uppercase tracking-wide">
                Strava
              </span>
            )}
            {(w.source === "gmail_sync") && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 uppercase tracking-wide">
                Gmail
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{typeLabel}</span>
            {w.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {w.duration} min
              </span>
            )}
            {w.calories_burned ? (
              <span className="flex items-center gap-1" style={{ color: "hsl(var(--metric-activity))" }}>
                <Flame className="h-3 w-3" /> {w.calories_burned} kcal
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="text-xs text-muted-foreground">
          {format(new Date(w.completed_at || w.created_at), "h:mm a")}
        </span>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
          onClick={() => onDelete(w.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export default ActivityPage;

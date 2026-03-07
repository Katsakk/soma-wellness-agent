import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dumbbell, RefreshCw, Clock, Flame, Trash2, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
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

const ActivityPage = () => {
  const { user } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [allWorkouts, setAllWorkouts]     = useState<Workout[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState("today");
  const [syncOpen, setSyncOpen]           = useState(false);

  const fetchWorkouts = async () => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = subDays(new Date(), 30);

    const [todayRes, allRes] = await Promise.all([
      supabase.from("workouts").select("*").eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()).order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString()).order("created_at", { ascending: false }),
    ]);

    setTodayWorkouts(todayRes.data || []);
    setAllWorkouts(allRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWorkouts(); }, [user]);

  // Handle OAuth popup callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected" && window.opener) {
      window.opener.postMessage({ type: "gmail-connected" }, window.location.origin);
      window.close();
    }
  }, []);

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
        <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)} className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Sync
        </Button>
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
          <p className="font-medium text-sm text-foreground truncate">{w.name}</p>
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

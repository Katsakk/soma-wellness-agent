import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const ActivityPage = () => {
  const { user } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");
  const [syncOpen, setSyncOpen] = useState(false);

  const fetchWorkouts = async () => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = subDays(new Date(), 30);

    const [todayRes, allRes] = await Promise.all([
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: false }),
    ]);

    setTodayWorkouts(todayRes.data || []);
    setAllWorkouts(allRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkouts();
  }, [user]);

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

  const typeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      cardio: "🏃 Cardio",
      strength: "💪 Strength",
      flexibility: "🧘 Flexibility",
      sports: "⚽ Sports",
      hiit: "🔥 HIIT",
      other: "🏋️ General",
    };
    return labels[type || "other"] || labels.other;
  };

  const WorkoutList = ({ workouts }: { workouts: Workout[] }) => (
    <div className="space-y-3">
      {workouts.map((w) => (
        <Card key={w.id} className="group">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{w.name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{typeLabel(w.workout_type)}</span>
                  {w.duration && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {w.duration} min
                    </span>
                  )}
                  {w.calories_burned && (
                    <span className="flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> {w.calories_burned} cal
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-muted-foreground">
                {format(new Date(w.completed_at || w.created_at), "h:mm a")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(w.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground text-sm mt-1">Workouts and exercise history</p>
        </div>
        <Button size="sm" onClick={() => setSyncOpen(true)}>
          <RefreshCw className="h-4 w-4 mr-1" /> Sync Workouts
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayWorkouts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-xl bg-muted p-4 mb-4">
                  <Dumbbell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No workouts yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell your wellness coach about a workout or sync from an app
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <TodayActivitySummary workouts={todayWorkouts} />
              <WorkoutList workouts={todayWorkouts} />
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <WeeklyActivityView workouts={allWorkouts} />
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MonthlyActivityView workouts={allWorkouts} />
          )}
        </TabsContent>
      </Tabs>

      <SyncWorkoutsDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </div>
  );
};

export default ActivityPage;

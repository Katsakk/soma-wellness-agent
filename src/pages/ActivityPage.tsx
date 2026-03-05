import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Plus, Clock, Flame, Calendar } from "lucide-react";
import { format } from "date-fns";

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
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setWorkouts(data || []);
        setLoading(false);
      });
  }, [user]);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground text-sm mt-1">Workouts and exercise history</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Generate workout
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Loading workouts...</p>
          </CardContent>
        </Card>
      ) : workouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-xl bg-muted p-4 mb-4">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No workouts yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tell your wellness coach about a workout or generate one
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <Card key={w.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
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
                <span className="text-xs text-muted-foreground">
                  {format(new Date(w.completed_at || w.created_at), "h:mm a")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityPage;

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Drumstick, Moon, Footprints, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChatInterface from "@/components/ChatInterface";

const DEFAULT_TARGETS = { calories: 2000, protein: 100 };

const Index = () => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "there";
  const [totals, setTotals] = useState({ calories: 0, protein: 0, workoutMin: 0 });
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    Promise.all([
      supabase
        .from("meals")
        .select("calories, protein")
        .eq("user_id", user.id)
        .gte("meal_time", todayStart.toISOString()),
      supabase
        .from("workouts")
        .select("duration")
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("goals")
        .select("target_calories, target_protein")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1),
    ]).then(([mealsRes, workoutsRes, goalsRes]) => {
      const meals = mealsRes.data || [];
      const workouts = workoutsRes.data || [];
      setTotals({
        calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
        protein: meals.reduce((s, m) => s + (Number(m.protein) || 0), 0),
        workoutMin: workouts.reduce((s, w) => s + (w.duration || 0), 0),
      });
      if (goalsRes.data?.[0]) {
        const g = goalsRes.data[0];
        setTargets({
          calories: g.target_calories || DEFAULT_TARGETS.calories,
          protein: g.target_protein || DEFAULT_TARGETS.protein,
        });
      }
      setLoaded(true);
    });
  }, [user]);

  // Score out of 10 — weighted: calories 4pts, protein 3pts, activity 3pts
  const calcScore = () => {
    if (!loaded) return null;
    const calScore = Math.min(totals.calories / targets.calories, 1) * 4;
    const proScore = Math.min(totals.protein / targets.protein, 1) * 3;
    const actScore = Math.min(totals.workoutMin / 30, 1) * 3; // 30min target
    return Math.round((calScore + proScore + actScore) * 10) / 10;
  };
  const score = calcScore();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hey {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your health snapshot for today.</p>
      </div>

      {/* Today header with score */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Today</h2>
        {loaded && score !== null && (
          <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1">
            <Star className="h-3.5 w-3.5 text-warning fill-warning" />
            <span className="text-sm font-bold">{score}</span>
            <span className="text-[10px] text-muted-foreground">/ 10</span>
          </div>
        )}
      </div>

      {/* Daily summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Calories</p>
              <p className="text-lg font-bold">{loaded ? (totals.calories || "—") : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <Drumstick className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Protein</p>
              <p className="text-lg font-bold">{loaded ? (totals.protein ? `${Math.round(totals.protein)}g` : "—") : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-muted p-2">
              <Footprints className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Steps</p>
              <p className="text-lg font-bold">—</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-muted p-2">
              <Moon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sleep</p>
              <p className="text-lg font-bold">—</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat */}
      <ChatInterface />

    </div>
  );
};

export default Index;

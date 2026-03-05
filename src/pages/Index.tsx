import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Drumstick, Moon, Footprints, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChatInterface from "@/components/ChatInterface";
import somaLogo from "@/assets/soma-logo.png";

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
    const calPct = Math.min(totals.calories / targets.calories, 1);
    const proPct = Math.min(totals.protein / targets.protein, 1);
    const actPct = Math.min(totals.workoutMin / 30, 1);
    const calScore = calPct * 4;
    const proScore = proPct * 3;
    const actScore = actPct * 3;
    return {
      total: Math.round((calScore + proScore + actScore) * 10) / 10,
      calPct,
      proPct,
      actPct,
    };
  };
  const scoreData = calcScore();

  const getScoreTip = () => {
    if (!scoreData) return "";
    const weak: string[] = [];
    if (scoreData.calPct < 0.5) weak.push("log more meals");
    if (scoreData.proPct < 0.5) weak.push("eat more protein");
    if (scoreData.actPct < 0.5) weak.push("get a workout in");
    if (weak.length === 0) return "Great job today! Keep it up 💪";
    return `To improve, ${weak.join(" and ")}.`;
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-1rem)] space-y-3">
      {/* Logo centered */}
      <div className="flex justify-center">
        <img src={somaLogo} alt="SOMA" className="h-12 w-auto" />
      </div>

      {/* Today label — matches tab trigger font */}
      <p className="text-sm font-medium">Today</p>

      {/* Score card */}
      {loaded && scoreData && (
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex items-center justify-center rounded-xl bg-warning/10 h-12 w-12 shrink-0">
              <div className="text-center">
                <Star className="h-3.5 w-3.5 text-warning fill-warning mx-auto mb-0.5" />
                <span className="text-base font-bold leading-none">{scoreData.total}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Daily Score <span className="text-muted-foreground font-normal">/ 10</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">{getScoreTip()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily summary cards — compact */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="flex flex-col items-center gap-1 p-2.5">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] text-muted-foreground">Calories</p>
            <p className="text-xs font-bold">{loaded ? (totals.calories || "—") : "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/10">
          <CardContent className="flex flex-col items-center gap-1 p-2.5">
            <Drumstick className="h-3.5 w-3.5 text-accent" />
            <p className="text-[10px] text-muted-foreground">Protein</p>
            <p className="text-xs font-bold">{loaded ? (totals.protein ? `${Math.round(totals.protein)}g` : "—") : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-2.5">
            <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">Steps</p>
            <p className="text-xs font-bold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-2.5">
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">Sleep</p>
            <p className="text-xs font-bold">—</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat — fills remaining space */}
      <Card className="border-border/50 flex-1 min-h-0 flex flex-col">
        <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
          <ChatInterface />
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Drumstick, Zap, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChatInterface from "@/components/ChatInterface";
import ConversationList from "@/components/chat/ConversationList";
import { useConversations } from "@/hooks/useConversations";
import somaLogo from "@/assets/soma-logo.png";

const DEFAULT_TARGETS = { calories: 2000, protein: 100 };
const DEFAULT_ACTIVITY_TARGET = 30;

const Index = () => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "there";
  const [totals, setTotals] = useState({ calories: 0, protein: 0, workoutMin: 0, caloriesBurned: 0 });
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [activityTarget, setActivityTarget] = useState(DEFAULT_ACTIVITY_TARGET);
  const [loaded, setLoaded] = useState(false);

  const {
    conversations,
    activeId,
    setActiveId,
    loaded: convsLoaded,
    createConversation,
    deleteConversation,
    renameConversation,
    autoTitle,
    touchConversation,
  } = useConversations();

  // Auto-create first conversation if none exist
  useEffect(() => {
    if (convsLoaded && conversations.length === 0 && user) {
      createConversation("New Chat");
    }
  }, [convsLoaded, conversations.length, user, createConversation]);

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
        .select("duration, calories_burned")
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("goals")
        .select("*")
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
        caloriesBurned: workouts.reduce((s, w) => s + (w.calories_burned || 0), 0),
      });
      if (goalsRes.data?.[0]) {
        const g = goalsRes.data[0] as any;
        setTargets({
          calories: g.target_calories || DEFAULT_TARGETS.calories,
          protein: g.target_protein || DEFAULT_TARGETS.protein,
        });
        const exDays = g.exercise_days_per_week ?? 3;
        setActivityTarget(Math.round(30 + (exDays - 3) * 5));
      }
      setLoaded(true);
    });
  }, [user]);

  const calcScore = () => {
    if (!loaded) return null;
    const calPct = Math.min(totals.calories / targets.calories, 1);
    const proPct = Math.min(totals.protein / targets.protein, 1);
    const actPct = Math.min(totals.workoutMin / activityTarget, 1);
    return {
      total: Math.round((calPct * 4 + proPct * 3 + actPct * 3) * 10) / 10,
      calPct, proPct, actPct,
    };
  };
  const scoreData = calcScore();

  const getScoreInsight = () => {
    if (!scoreData) return { tip: "", details: [] as string[] };
    const details: string[] = [];
    if (scoreData.calPct >= 0.8) details.push("Calorie intake is on track");
    else if (scoreData.calPct >= 0.4) details.push("You're halfway on calories — log a meal to close the gap");
    else details.push("Calorie intake is low — try logging your next meal");

    if (scoreData.proPct >= 0.8) details.push("Protein goal nearly met");
    else if (scoreData.proPct >= 0.4) details.push("Protein is behind — consider a high-protein snack");
    else details.push("Protein is very low — prioritize protein-rich foods");

    if (scoreData.actPct >= 0.8) details.push("Activity target almost reached");
    else if (scoreData.actPct >= 0.4) details.push("Some activity logged — a short walk could help");
    else details.push("No activity yet — even 15 minutes makes a difference");

    const tip = scoreData.total >= 8 ? "You're having a great day!" :
                scoreData.total >= 5 ? "Solid progress — a few tweaks will get you there." :
                "Still early — small steps add up.";
    return { tip, details };
  };
  const insight = getScoreInsight();

  const handleFirstMessage = (text: string) => {
    if (activeId) {
      autoTitle(activeId, text);
      touchConversation(activeId);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-1rem)] space-y-3">
      <div className="flex justify-center">
        <img src={somaLogo} alt="SOMA" className="h-20 w-auto" />
      </div>
      <p className="text-sm font-medium">Today's Snapshot</p>

      {loaded && scoreData && (() => {
        const pct = scoreData.total / 10;
        const r = 28;
        const circ = 2 * Math.PI * r;
        const offset = circ * (1 - pct);
        return (
          <Card>
            <CardContent className="p-3 flex items-start gap-4">
              <div className="shrink-0 relative" style={{ width: 68, height: 68 }}>
                <svg width={68} height={68} viewBox="0 0 68 68">
                  <circle cx={34} cy={34} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
                  <circle cx={34} cy={34} r={r} fill="none" stroke="hsl(var(--foreground))" strokeWidth={5}
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                    transform="rotate(-90 34 34)" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold leading-none">{scoreData.total}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-semibold">Daily Score <span className="text-xs font-normal text-muted-foreground">/ 10</span></p>
                <p className="text-xs text-muted-foreground">{insight.tip}</p>
                <ul className="space-y-0.5">
                  {insight.details.map((d, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
        <Card className="bg-destructive/5 border-destructive/10">
          <CardContent className="flex flex-col items-center gap-1 p-2.5">
            <Zap className="h-3.5 w-3.5 text-destructive" />
            <p className="text-[10px] text-muted-foreground">Active Energy</p>
            <p className="text-xs font-bold">{loaded ? (totals.caloriesBurned || "—") : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 flex-1 min-h-0 flex flex-col">
        <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
          <ChatInterface conversationId={activeId} onFirstMessage={handleFirstMessage} />
        </CardContent>
      </Card>

      {/* Conversation list */}
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={() => createConversation()}
        onDelete={deleteConversation}
        onRename={renameConversation}
      />
    </div>
  );
};

export default Index;

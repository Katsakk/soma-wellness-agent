import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Utensils, Dumbbell, Lightbulb, Trophy } from "lucide-react";
import { format } from "date-fns";
import ConversationList from "@/components/chat/ConversationList";
import ChatInterface from "@/components/ChatInterface";
import { useConversations } from "@/hooks/useConversations";

const DEFAULTS = {
  calories: 2000, protein: 150, fiber: 30,
  hydration: 2.5, carbs: 250, fat: 70, workoutMin: 45,
};

// ── Radial ring gauge ──────────────────────────────────────────────────────────
function RadialRing({
  value, target, colorToken, size = 80, strokeWidth = 6,
  label, unit, format: fmt,
}: {
  value: number; target: number; colorToken: string;
  size?: number; strokeWidth?: number;
  label: string; unit?: string; format?: (v: number) => string;
}) {
  const isOver = value > target;
  const pct = Math.min(value / Math.max(target, 1), 1);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const colorVar = isOver ? "--metric-over" : colorToken;
  const strokeColor = `hsl(var(${colorVar}))`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
          {/* Subtle glow behind active arc */}
          {pct > 0 && (
            <circle cx={cx} cy={cx} r={r} fill="none"
              stroke={strokeColor} strokeWidth={strokeWidth + 4}
              strokeDasharray={circ} strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cx})`}
              opacity={0.12}
            />
          )}
          {/* Track */}
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          {/* Fill arc */}
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke={strokeColor} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold leading-none" style={{
            color: strokeColor,
            fontSize: size > 110 ? "1.25rem" : "0.75rem",
          }}>
            {fmt ? fmt(value) : value}
          </span>
          {unit && (
            <span className="text-[9px] text-muted-foreground mt-0.5">{unit}</span>
          )}
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </span>
    </div>
  );
}

// ── Quick action tile ─────────────────────────────────────────────────────────
function ActionTile({
  icon: Icon, title, subtitle, colorToken, onClick,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  colorToken: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card shadow-card
                 hover:bg-secondary hover:border-border/80 active:scale-[0.98]
                 transition-all duration-200 text-left w-full"
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ backgroundColor: `hsl(var(${colorToken}) / 0.12)` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: `hsl(var(${colorToken}))` }} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "there";

  const [totals, setTotals] = useState({
    calories: 0, protein: 0, carbs: 0, fat: 0,
    workoutMin: 0, caloriesBurned: 0,
  });
  const [targets, setTargets] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const {
    conversations, activeId, setActiveId, loaded: convsLoaded,
    createConversation, deleteConversation, renameConversation,
  } = useConversations();

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
      supabase.from("meals")
        .select("calories, protein, carbs, fats")
        .eq("user_id", user.id)
        .gte("meal_time", todayStart.toISOString()),
      supabase.from("workouts")
        .select("duration, calories_burned")
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()),
      supabase.from("goals")
        .select("*").eq("user_id", user.id).eq("is_active", true).limit(1),
    ]).then(([mealsRes, workoutsRes, goalsRes]) => {
      const meals = mealsRes.data || [];
      const workouts = workoutsRes.data || [];
      setTotals({
        calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
        protein: meals.reduce((s, m) => s + (Number(m.protein) || 0), 0),
        carbs: meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0),
        fat: meals.reduce((s, m) => s + (Number((m as any).fats) || 0), 0),
        workoutMin: workouts.reduce((s, w) => s + (w.duration || 0), 0),
        caloriesBurned: workouts.reduce((s, w) => s + (w.calories_burned || 0), 0),
      });
      if (goalsRes.data?.[0]) {
        const g = goalsRes.data[0] as any;
        setTargets({
          calories: g.target_calories || DEFAULTS.calories,
          protein: g.target_protein || DEFAULTS.protein,
          fiber: DEFAULTS.fiber,
          hydration: DEFAULTS.hydration,
          carbs: g.target_carbs || DEFAULTS.carbs,
          fat: g.target_fats || DEFAULTS.fat,
          workoutMin: Math.round(30 + ((g.exercise_days_per_week ?? 3) - 3) * 5),
        });
      }
      setLoaded(true);
    });
  }, [user]);

  // AI insight logic
  const getInsight = () => {
    if (!loaded) return "Loading your daily summary…";
    const calPct = totals.calories / targets.calories;
    const proPct = totals.protein / targets.protein;
    const actPct = totals.workoutMin / targets.workoutMin;
    if (actPct === 0 && calPct === 0)
      return "Start your day by logging a meal or a workout. Every entry helps your AI coach.";
    if (proPct < 0.4)
      return `You're behind on protein today — only ${Math.round(totals.protein)}g of ${targets.protein}g. Prioritize a protein-rich meal.`;
    if (calPct < 0.4)
      return `Calorie intake is low for this time of day. Make sure you're fuelling adequately for your goal.`;
    if (actPct === 0)
      return "No activity logged yet. Even a 20-minute walk contributes to your weekly goal.";
    if (calPct >= 0.95)
      return `You're close to your calorie target. Keep dinner lighter if your goal is fat loss.`;
    return `Solid progress today — ${Math.round(totals.protein)}g protein and ${Math.round(totals.workoutMin)} active minutes logged.`;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6 pb-32">

      {/* ── 1. Greeting + date ──────────────────────────────────── */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Good {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* ── 2. AI Insight card ──────────────────────────────────── */}
      <div className="surface-ai rounded-2xl p-4 shadow-glow-ai">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-metric-ai/15 shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-metric-ai" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-metric-ai font-semibold mb-1">
              AI Insight
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {getInsight()}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. AI Chat ──────────────────────────────────────────── */}
      <div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={() => createConversation()}
          onDelete={deleteConversation}
          onRename={renameConversation}
        />
        {activeId && (
          <div className="mt-3">
            <ChatInterface
              conversationId={activeId}
              onFirstMessage={(text) => renameConversation(activeId, text.slice(0, 40))}
            />
          </div>
        )}
      </div>

      {/* ── 4. Nutrition monitor ────────────────────────────────── */}
      <div className="surface-elevated p-5 space-y-6">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Today's Nutrition
        </p>

        {/* Hero: Calories ring */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <RadialRing
              value={loaded ? totals.calories : 0}
              target={targets.calories}
              colorToken="--metric-calories"
              size={140} strokeWidth={9}
              label="Calories"
              unit={`/ ${targets.calories} kcal`}
              format={(v) => Math.round(v).toString()}
            />
          </div>
        </div>

        {/* Supporting: Protein · Fiber · Hydration */}
        <div className="grid grid-cols-3 gap-2">
          <RadialRing
            value={loaded ? Math.round(totals.protein) : 0}
            target={targets.protein}
            colorToken="--metric-protein"
            size={80} strokeWidth={6}
            label="Protein"
            unit={`/ ${targets.protein}g`}
            format={(v) => `${v}g`}
          />
          <RadialRing
            value={0}
            target={targets.fiber}
            colorToken="--metric-fiber"
            size={80} strokeWidth={6}
            label="Fiber"
            unit={`/ ${targets.fiber}g`}
            format={(v) => `${v}g`}
          />
          <RadialRing
            value={0}
            target={targets.hydration}
            colorToken="--metric-hydration"
            size={80} strokeWidth={6}
            label="Water"
            unit={`/ ${targets.hydration}L`}
            format={(v) => `${v}L`}
          />
        </div>
      </div>

      {/* ── 5. Secondary nutrition ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <SecondaryMetric
          label="Carbs"
          value={loaded ? Math.round(totals.carbs) : 0}
          target={targets.carbs}
          unit="g"
          colorToken="--metric-carbs"
        />
        <SecondaryMetric
          label="Fat"
          value={loaded ? Math.round(totals.fat) : 0}
          target={targets.fat}
          unit="g"
          colorToken="--metric-fat"
        />
      </div>

      {/* ── 6. Movement ─────────────────────────────────────────── */}
      <div className="surface-elevated p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-4">
          Movement
        </p>
        <div className="flex items-center gap-5">
          <RadialRing
            value={loaded ? totals.workoutMin : 0}
            target={targets.workoutMin}
            colorToken="--metric-activity"
            size={76} strokeWidth={6}
            label="Active"
            unit={`/ ${targets.workoutMin}m`}
            format={(v) => `${v}m`}
          />
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-lg font-bold text-foreground">
                {loaded ? totals.workoutMin : 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">min active</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loaded && totals.workoutMin > 0
                  ? `${totals.caloriesBurned} kcal burned`
                  : "No workout logged yet"}
              </p>
            </div>
            {loaded && totals.workoutMin === 0 && (
              <p className="text-xs text-metric-activity/80">
                Log a workout or sync from Gmail
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 7. Quick actions ────────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ActionTile
            icon={Utensils}
            title="Log meal"
            subtitle="Track what you eat"
            colorToken="--metric-calories"
            onClick={() => navigate("/meals")}
          />
          <ActionTile
            icon={Lightbulb}
            title="Meal ideas"
            subtitle="AI-powered suggestions"
            colorToken="--metric-fiber"
            onClick={() => navigate("/meals")}
          />
          <ActionTile
            icon={Dumbbell}
            title="Log activity"
            subtitle="Record your workout"
            colorToken="--metric-activity"
            onClick={() => navigate("/activity")}
          />
          <ActionTile
            icon={Trophy}
            title="Workout ideas"
            subtitle="Personalized plans"
            colorToken="--metric-protein"
            onClick={() => navigate("/activity")}
          />
        </div>
      </div>

    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function SecondaryMetric({
  label, value, target, unit, colorToken,
}: {
  label: string; value: number; target: number; unit: string; colorToken: string;
}) {
  const pct = Math.min(value / Math.max(target, 1), 1);
  return (
    <div className="surface-elevated p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {value}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: `hsl(var(${colorToken}))`,
          }}
        />
      </div>
    </div>
  );
}

export default Index;

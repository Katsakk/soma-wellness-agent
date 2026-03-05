import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Clock, Dumbbell, Timer, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Workout {
  id: string;
  name: string;
  workout_type: string | null;
  duration: number | null;
  calories_burned: number | null;
  completed_at: string | null;
  created_at: string;
}

interface TodayActivitySummaryProps {
  workouts: Workout[];
}

const TodayActivitySummary = ({ workouts }: TodayActivitySummaryProps) => {
  const { user } = useAuth();
  const [burnTarget, setBurnTarget] = useState(500);

  useEffect(() => {
    if (!user) return;
    supabase.from("goals").select("*").eq("user_id", user.id).eq("is_active", true).limit(1).then(({ data }) => {
      if (data?.[0]) {
        const g = data[0] as any;
        const exDays = g.exercise_days_per_week ?? 3;
        // Scale burn target: base 400 + 50 per exercise day above 3
        setBurnTarget(400 + Math.max(0, exDays - 2) * 50);
      }
    });
  }, [user]);

  const totalCalories = workouts.reduce((s, w) => s + (w.calories_burned || 0), 0);
  const totalDuration = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const workoutCount = workouts.length;

  const progress = Math.min(totalCalories / burnTarget, 1);
  const size = 240;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2 - 16;
  const center = size / 2;
  const startAngle = 120;
  const sweepAngle = 300;
  const endAngle = startAngle + sweepAngle;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  };
  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };
  const progressAngle = startAngle + sweepAngle * progress;

  const categories = [
    { key: "cardio", label: "Cardio", emoji: "🏃" },
    { key: "strength", label: "Strength", emoji: "💪" },
    { key: "hiit", label: "HIIT", emoji: "🔥" },
    { key: "full_body", label: "Full Body", emoji: "🏋️" },
    { key: "upper_body", label: "Upper Body", emoji: "💪" },
    { key: "lower_body", label: "Lower Body", emoji: "🦵" },
    { key: "flexibility", label: "Flexibility", emoji: "🧘" },
    { key: "sports", label: "Sports", emoji: "⚽" },
  ];

  const categoryKeywords: Record<string, string[]> = {
    cardio: ["cardio", "run", "jog", "cycling", "bike", "swim", "walk"],
    strength: ["strength", "weights", "lifting", "deadlift", "squat", "bench"],
    hiit: ["hiit", "interval", "tabata", "circuit"],
    full_body: ["full body", "full-body", "crossfit", "functional"],
    upper_body: ["upper body", "upper-body", "chest", "back", "shoulders", "arms", "bicep", "tricep", "push"],
    lower_body: ["lower body", "lower-body", "legs", "glutes", "hamstring", "calf", "pull"],
    flexibility: ["flexibility", "yoga", "stretch", "pilates", "mobility"],
    sports: ["sports", "football", "basketball", "tennis", "soccer", "boxing", "martial"],
  };

  const categorizeWorkout = (w: Workout): string => {
    const type = w.workout_type?.toLowerCase() || "";
    if (categories.some((c) => c.key === type)) return type;
    const text = `${w.name} ${type}`.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => text.includes(kw))) return cat;
    }
    return "full_body";
  };

  const categoryCals = categories.reduce<Record<string, number>>((acc, c) => { acc[c.key] = 0; return acc; }, {});
  workouts.forEach((w) => { categoryCals[categorizeWorkout(w)] += w.calories_burned || 0; });
  const activeCategories = categories.filter((c) => categoryCals[c.key] > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 pb-4 space-y-2">
          <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <path d={describeArc(startAngle, endAngle)} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} strokeLinecap="round" />
              {progress > 0.01 && <path d={describeArc(startAngle, progressAngle)} fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth} strokeLinecap="round" />}
              <g transform={`translate(${center}, ${center})`}>
                <g transform="translate(-12, -50)"><Flame width={24} height={24} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" opacity={0.85} /></g>
                <text textAnchor="middle" y={-4} className="fill-foreground" style={{ fontSize: "36px", fontWeight: 700 }}>{totalCalories}</text>
                <text textAnchor="middle" y={16} className="fill-muted-foreground" style={{ fontSize: "12px" }}>Burned</text>
              </g>
              {(() => { const endPos = polarToCartesian(endAngle); return <text x={endPos.x + 8} y={endPos.y + 4} className="fill-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>{burnTarget.toLocaleString()}</text>; })()}
            </svg>
          </div>
          <div className="flex items-center gap-0 pt-2">
            <StatBar icon={Timer} label="Duration" value={`${totalDuration} min`} color="bg-primary" progress={Math.min(totalDuration / 60, 1)} />
            <StatBar icon={Dumbbell} label="Workouts" value={`${workoutCount}`} color="bg-accent-foreground" progress={Math.min(workoutCount / 3, 1)} />
          </div>
        </CardContent>
      </Card>
      {activeCategories.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {activeCategories.map((cat) => (
            <div key={cat.key} className="rounded-xl border bg-card p-3 text-center space-y-1">
              <span className="text-base">{cat.emoji}</span>
              <p className="text-[11px] text-muted-foreground">{cat.label}</p>
              <p className="text-sm font-bold">{Math.round(categoryCals[cat.key])} <span className="text-[10px] font-normal text-muted-foreground">kcal</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function StatBar({ icon: Icon, label, value, color, progress }: { icon: any; label: string; value: string; color: string; progress: number }) {
  return (
    <div className="flex-1 px-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1"><Icon className="h-3 w-3 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">{label}</span></div>
        <span className="text-[11px] font-semibold">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(progress * 100, 2)}%` }} />
      </div>
    </div>
  );
}

export default TodayActivitySummary;

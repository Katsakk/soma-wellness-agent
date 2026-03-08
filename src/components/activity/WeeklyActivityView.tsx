import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Clock, Flame, Dumbbell } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

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

interface WeeklyActivityViewProps {
  workouts: Workout[];
}

const TYPE_LABELS: Record<string, string> = {
  cardio: "Cardio", strength: "Strength", flexibility: "Flexibility",
  sports: "Sports", hiit: "HIIT", full_body: "Full Body",
  upper_body: "Upper Body", lower_body: "Lower Body", other: "General",
};

const WeeklyActivityView = ({ workouts }: WeeklyActivityViewProps) => {
  const data = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayWorkouts = workouts.filter((w) => {
        const t = new Date(w.completed_at || w.created_at);
        return t >= dayStart && t <= dayEnd;
      });
      return {
        day: format(date, "EEE"),
        calories: dayWorkouts.reduce((s, w) => s + (w.calories_burned || 0), 0),
        duration: dayWorkouts.reduce((s, w) => s + (w.duration || 0), 0),
        count: dayWorkouts.length,
      };
    });
  }, [workouts]);

  const totalCals = data.reduce((s, d) => s + d.calories, 0);
  const totalDuration = data.reduce((s, d) => s + d.duration, 0);
  const activeDays = data.filter((d) => d.count > 0).length;

  // Group workouts by day for the history section
  const workoutsByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayWorkouts = workouts.filter((w) => {
        const t = new Date(w.completed_at || w.created_at);
        return t >= dayStart && t <= dayEnd;
      });
      return { date, dayWorkouts };
    }).filter((d) => d.dayWorkouts.length > 0);
  }, [workouts]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Calories Burned</p>
            <p className="text-lg font-bold">{totalCals || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Minutes</p>
            <p className="text-lg font-bold">{totalDuration || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Days</p>
            <p className="text-lg font-bold">{activeDays} / 7</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 pb-2">
          <p className="text-sm font-medium mb-3">Calories Burned by Day</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── History ───────────────────────────────────────────── */}
      {workoutsByDay.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">History</p>
          {workoutsByDay.map(({ date, dayWorkouts }) => (
            <div key={date.toISOString()} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground px-1">
                {format(date, "EEEE, MMM d")}
              </p>
              {dayWorkouts.map((w) => (
                <WorkoutHistoryCard key={w.id} workout={w} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function WorkoutHistoryCard({ workout: w }: { workout: Workout }) {
  const typeLabel = TYPE_LABELS[w.workout_type || "other"] ?? TYPE_LABELS.other;
  return (
    <div className="surface-elevated p-4 flex items-center gap-3">
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
        style={{ backgroundColor: "hsl(var(--metric-activity) / 0.12)" }}
      >
        <Dumbbell className="h-4 w-4" style={{ color: "hsl(var(--metric-activity))" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-foreground truncate">{w.name}</p>
          {w.source === "strava" && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 uppercase tracking-wide">Strava</span>
          )}
          {w.source === "gmail_sync" && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 uppercase tracking-wide">Gmail</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>{typeLabel}</span>
          {w.duration && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {w.duration} min</span>
          )}
          {w.calories_burned ? (
            <span className="flex items-center gap-1" style={{ color: "hsl(var(--metric-activity))" }}>
              <Flame className="h-3 w-3" /> {w.calories_burned} kcal
            </span>
          ) : null}
        </div>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {format(new Date(w.completed_at || w.created_at), "h:mm a")}
      </span>
    </div>
  );
}

export default WeeklyActivityView;

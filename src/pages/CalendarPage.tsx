import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

const DEFAULT_TARGETS = { calories: 2000, protein: 100 };
const DEFAULT_ACTIVITY_TARGET = 30;

interface DayScore {
  date: Date;
  score: number;
}

const CalendarPage = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [dayScores, setDayScores] = useState<DayScore[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    setLoading(true);

    Promise.all([
      supabase.from("meals").select("meal_time, calories, protein")
        .eq("user_id", user.id)
        .gte("meal_time", start.toISOString())
        .lte("meal_time", end.toISOString()),
      supabase.from("workouts").select("created_at, duration, calories_burned")
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString()),
      supabase.from("goals").select("*")
        .eq("user_id", user.id).eq("is_active", true).limit(1),
    ]).then(([mealsRes, workoutsRes, goalsRes]) => {
      const meals = mealsRes.data || [];
      const workouts = workoutsRes.data || [];
      const g = goalsRes.data?.[0] as any;
      const targets = {
        calories: g?.target_calories || DEFAULT_TARGETS.calories,
        protein: g?.target_protein || DEFAULT_TARGETS.protein,
      };
      const exDays = g?.exercise_days_per_week ?? 3;
      const actTarget = Math.round(30 + (exDays - 3) * 5);

      const days = eachDayOfInterval({ start, end });
      const scores: DayScore[] = days.map((day) => {
        const dayMeals = meals.filter((m) => isSameDay(new Date(m.meal_time), day));
        const dayWorkouts = workouts.filter((w) => isSameDay(new Date(w.created_at), day));

        const cal = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
        const pro = dayMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0);
        const mins = dayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);

        const calPct = Math.min(cal / targets.calories, 1);
        const proPct = Math.min(pro / targets.protein, 1);
        const actPct = Math.min(mins / actTarget, 1);

        const score = Math.round((calPct * 4 + proPct * 3 + actPct * 3) * 10) / 10;
        return { date: day, score };
      });

      setDayScores(scores);
      setLoading(false);
    });
  }, [user, month]);

  const selectedDayScore = useMemo(() => {
    if (!selectedDay) return null;
    return dayScores.find((d) => isSameDay(d.date, selectedDay));
  }, [selectedDay, dayScores]);

  const getScoreColor = (score: number) => {
    if (score === 0) return "";
    if (score >= 8) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (score >= 4) return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
    return "bg-red-500/20 text-red-700 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Great";
    if (score >= 5) return "Decent";
    if (score > 0) return "Low";
    return "No data";
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily health scores at a glance</p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            month={month}
            onMonthChange={setMonth}
            className={cn("p-3 pointer-events-auto")}
            modifiers={{
              scored: dayScores.filter((d) => d.score > 0).map((d) => d.date),
            }}
            components={{
              DayContent: ({ date }) => {
                const entry = dayScores.find((d) => isSameDay(d.date, date));
                const colorClass = entry && entry.score > 0 ? getScoreColor(entry.score) : "";
                return (
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm",
                    colorClass
                  )}>
                    {date.getDate()}
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500/40" /> Low (&lt;4)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500/40" /> Medium (4-7)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500/40" /> Great (8+)</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{format(selectedDay, "EEEE, MMM d")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedDayScore ? getScoreLabel(selectedDayScore.score) : "No data"}
                </p>
              </div>
              {selectedDayScore && selectedDayScore.score > 0 && (
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold",
                  getScoreColor(selectedDayScore.score)
                )}>
                  {selectedDayScore.score}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalendarPage;

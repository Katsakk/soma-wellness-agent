import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Workout {
  duration: number | null;
  calories_burned: number | null;
  completed_at: string | null;
  created_at: string;
}

interface WeeklyActivityViewProps {
  workouts: Workout[];
}

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
    </div>
  );
};

export default WeeklyActivityView;

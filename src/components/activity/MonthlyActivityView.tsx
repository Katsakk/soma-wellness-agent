import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Workout {
  duration: number | null;
  calories_burned: number | null;
  completed_at: string | null;
  created_at: string;
}

interface MonthlyActivityViewProps {
  workouts: Workout[];
}

const MonthlyActivityView = ({ workouts }: MonthlyActivityViewProps) => {
  const data = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayWorkouts = workouts.filter((w) => {
        const t = new Date(w.completed_at || w.created_at);
        return t >= dayStart && t <= dayEnd;
      });
      return {
        date: format(date, "d"),
        fullDate: format(date, "MMM d"),
        calories: dayWorkouts.reduce((s, w) => s + (w.calories_burned || 0), 0),
        duration: dayWorkouts.reduce((s, w) => s + (w.duration || 0), 0),
        count: dayWorkouts.length,
      };
    });
  }, [workouts]);

  const totalCals = data.reduce((s, d) => s + d.calories, 0);
  const daysWithData = data.filter((d) => d.count > 0).length;
  const totalWorkouts = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Total Burned</p>
            <p className="text-sm font-bold">{totalCals.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Workouts</p>
            <p className="text-sm font-bold">{totalWorkouts}</p>
            <p className="text-[10px] text-muted-foreground">sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Active Days</p>
            <p className="text-sm font-bold">{daysWithData}</p>
            <p className="text-[10px] text-muted-foreground">/ 30</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 pb-2">
          <p className="text-sm font-medium mb-3">Calories Burned Trend</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={35} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="calories" stroke="hsl(var(--primary))" fill="url(#burnGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyActivityView;

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Meal {
  calories: number | null;
  protein: number | null;
  meal_time: string;
}

interface MonthlyMealsViewProps {
  meals: Meal[];
}

const MonthlyMealsView = ({ meals }: MonthlyMealsViewProps) => {
  const data = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayMeals = meals.filter((m) => {
        const t = new Date(m.meal_time);
        return t >= dayStart && t <= dayEnd;
      });
      return {
        date: format(date, "d"),
        fullDate: format(date, "MMM d"),
        calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
        protein: dayMeals.reduce((s, m) => s + (m.protein || 0), 0),
      };
    });
  }, [meals]);

  const totalCalories = data.reduce((s, d) => s + d.calories, 0);
  const daysWithData = data.filter((d) => d.calories > 0).length;
  const avgCalories = daysWithData ? Math.round(totalCalories / daysWithData) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-sm font-bold">{totalCalories.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Daily Avg</p>
            <p className="text-sm font-bold">{avgCalories || "—"}</p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Days Tracked</p>
            <p className="text-sm font-bold">{daysWithData}</p>
            <p className="text-[10px] text-muted-foreground">/ 30</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 pb-2">
          <p className="text-sm font-medium mb-3">Calorie Trend</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="calGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={4}
                />
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
                <Area
                  type="monotone"
                  dataKey="calories"
                  stroke="hsl(var(--warning))"
                  fill="url(#calGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyMealsView;

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Meal {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  meal_time: string;
}

interface WeeklyMealsViewProps {
  meals: Meal[];
}

const WeeklyMealsView = ({ meals }: WeeklyMealsViewProps) => {
  const data = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayMeals = meals.filter((m) => {
        const t = new Date(m.meal_time);
        return t >= dayStart && t <= dayEnd;
      });
      return {
        day: format(date, "EEE"),
        calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
        protein: dayMeals.reduce((s, m) => s + (m.protein || 0), 0),
        carbs: dayMeals.reduce((s, m) => s + (m.carbs || 0), 0),
        fats: dayMeals.reduce((s, m) => s + (m.fats || 0), 0),
      };
    });
    return days;
  }, [meals]);

  const avgCalories = Math.round(
    data.reduce((s, d) => s + d.calories, 0) / data.filter((d) => d.calories > 0).length || 0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Avg Daily Calories</p>
            <p className="text-lg font-bold">{avgCalories || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total This Week</p>
            <p className="text-lg font-bold">
              {data.reduce((s, d) => s + d.calories, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 pb-2">
          <p className="text-sm font-medium mb-3">Calories by Day</p>
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
                <Bar dataKey="calories" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 pb-2">
          <p className="text-sm font-medium mb-3">Macros by Day</p>
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
                <Bar dataKey="protein" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="macros" />
                <Bar dataKey="carbs" fill="hsl(var(--warning))" radius={[0, 0, 0, 0]} stackId="macros" />
                <Bar dataKey="fats" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} stackId="macros" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyMealsView;

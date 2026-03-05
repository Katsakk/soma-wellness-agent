import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, UtensilsCrossed, Flame, Drumstick, Wheat, Droplets, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import TodayMealsView from "@/components/meals/TodayMealsView";
import WeeklyMealsView from "@/components/meals/WeeklyMealsView";
import MonthlyMealsView from "@/components/meals/MonthlyMealsView";

interface MacroEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  meal_time: string;
  notes: string | null;
}

const DEFAULT_TARGETS = { calories: 2000, protein: 100, carbs: 250, fats: 67 };

const Meals = () => {
  const { user } = useAuth();
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<MacroEstimate | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("today");
  const [targets, setTargets] = useState(DEFAULT_TARGETS);

  const fetchMeals = async () => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = subDays(new Date(), 30);

    const [todayRes, allRes, goalsRes] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("meal_time", todayStart.toISOString())
        .order("meal_time", { ascending: false }),
      supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("meal_time", monthStart.toISOString())
        .order("meal_time", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1),
    ]);

    setTodayMeals(todayRes.data || []);
    setAllMeals(allRes.data || []);

    if (goalsRes.data?.[0]) {
      const g = goalsRes.data[0];
      setTargets({
        calories: g.target_calories || DEFAULT_TARGETS.calories,
        protein: g.target_protein || DEFAULT_TARGETS.protein,
        carbs: g.target_carbs || DEFAULT_TARGETS.carbs,
        fats: g.target_fats || DEFAULT_TARGETS.fats,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeals();
  }, [user]);

  const handleEstimate = async () => {
    if (!description.trim()) return;
    setEstimating(true);
    setEstimate(null);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-macros", {
        body: { description: description.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEstimate(data as MacroEstimate);
    } catch (e: any) {
      toast.error(e.message || "Failed to estimate macros");
    } finally {
      setEstimating(false);
    }
  };

  const handleSave = async () => {
    if (!estimate || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("meals").insert({
        user_id: user.id,
        name: estimate.name,
        calories: Math.round(estimate.calories),
        protein: Math.round(estimate.protein),
        carbs: Math.round(estimate.carbs),
        fats: Math.round(estimate.fats),
        notes: description.trim(),
        source: "ai_estimate",
      });
      if (error) throw error;
      toast.success("Meal logged!");
      setOpen(false);
      setDescription("");
      setEstimate(null);
      fetchMeals();
    } catch (e: any) {
      toast.error(e.message || "Failed to save meal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete meal");
    } else {
      setTodayMeals((prev) => prev.filter((m) => m.id !== id));
      setAllMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success("Meal deleted");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meals</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your daily nutrition</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDescription(""); setEstimate(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Log meal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log a meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Grilled chicken with rice and broccoli"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !estimating && handleEstimate()}
                  disabled={estimating}
                />
                <Button onClick={handleEstimate} disabled={estimating || !description.trim()} size="sm" className="shrink-0">
                  {estimating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>

              {estimating && (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Estimating macros…
                </div>
              )}

              {estimate && (
                <div className="space-y-3">
                  <p className="font-semibold text-sm">{estimate.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MacroCard icon={Flame} label="Calories" value={`${Math.round(estimate.calories)}`} unit="kcal" color="text-primary" />
                    <MacroCard icon={Drumstick} label="Protein" value={`${Math.round(estimate.protein)}`} unit="g" color="text-accent" />
                    <MacroCard icon={Wheat} label="Carbs" value={`${Math.round(estimate.carbs)}`} unit="g" color="text-warning" />
                    <MacroCard icon={Droplets} label="Fats" value={`${Math.round(estimate.fats)}`} unit="g" color="text-destructive" />
                  </div>
                  <p className="text-xs text-muted-foreground">AI-estimated values. Adjust as needed.</p>
                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save meal
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Time period tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayMeals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-xl bg-muted p-4 mb-4">
                  <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No meals logged today</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe what you ate and AI will estimate the macros
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <TodayMealsView meals={todayMeals} targets={targets} />
              <div className="space-y-2">
                {todayMeals.map((meal) => (
                  <Card key={meal.id} className="group">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{meal.name}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{meal.calories ?? 0} kcal</span>
                          <span>{meal.protein ?? 0}g P</span>
                          <span>{meal.carbs ?? 0}g C</span>
                          <span>{meal.fats ?? 0}g F</span>
                        </div>
                        {meal.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate italic">"{meal.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(meal.meal_time), "h:mm a")}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(meal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <WeeklyMealsView meals={allMeals} />
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MonthlyMealsView meals={allMeals} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function MacroCard({ icon: Icon, label, value, unit, color }: { icon: any; label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">
          {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default Meals;

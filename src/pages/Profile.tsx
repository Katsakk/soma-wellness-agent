import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Target, Settings, Link, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Keto", "Paleo", "Gluten-Free", "Dairy-Free", "Low-Carb", "High-Protein"];
const WORKOUT_OPTIONS = ["Running", "Cycling", "Swimming", "Yoga", "HIIT", "Strength Training", "Pilates", "CrossFit", "Boxing", "Walking"];
const UNIT_OPTIONS = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lbs, in)" },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.display_name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  // Goals state
  const [goals, setGoals] = useState({
    target_calories: "",
    target_protein: "",
    target_carbs: "",
    target_fats: "",
    target_weight: "",
  });
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [existingGoalId, setExistingGoalId] = useState<string | null>(null);

  // Preferences state
  const [prefs, setPrefs] = useState({
    dietary_preferences: [] as string[],
    workout_preferences: [] as string[],
    units: "metric",
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch goals
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGoals({
            target_calories: data.target_calories?.toString() || "",
            target_protein: data.target_protein?.toString() || "",
            target_carbs: data.target_carbs?.toString() || "",
            target_fats: data.target_fats?.toString() || "",
            target_weight: data.target_weight?.toString() || "",
          });
          setExistingGoalId(data.id);
        }
        setGoalsLoaded(true);
      });

    // Fetch preferences
    supabase
      .from("preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            dietary_preferences: data.dietary_preferences || [],
            workout_preferences: data.workout_preferences || [],
            units: data.units || "metric",
          });
        }
        setPrefsLoaded(true);
      });
  }, [user]);

  const handleSaveGoals = async () => {
    if (!user) return;
    setGoalsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        goal_type: "maintenance",
        is_active: true,
        target_calories: goals.target_calories ? parseInt(goals.target_calories) : null,
        target_protein: goals.target_protein ? parseInt(goals.target_protein) : null,
        target_carbs: goals.target_carbs ? parseInt(goals.target_carbs) : null,
        target_fats: goals.target_fats ? parseInt(goals.target_fats) : null,
        target_weight: goals.target_weight ? parseFloat(goals.target_weight) : null,
      };

      if (existingGoalId) {
        const { error } = await supabase.from("goals").update(payload).eq("id", existingGoalId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("goals").insert(payload).select().single();
        if (error) throw error;
        setExistingGoalId(data.id);
      }
      toast.success("Goals saved!");
      setGoalsOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save goals");
    } finally {
      setGoalsSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setPrefsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        dietary_preferences: prefs.dietary_preferences,
        workout_preferences: prefs.workout_preferences,
        units: prefs.units,
      };

      // Upsert — try update first, insert if not exists
      const { data: existing } = await supabase
        .from("preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("preferences").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("preferences").insert(payload);
        if (error) throw error;
      }
      toast.success("Preferences saved!");
      setPrefsOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const togglePref = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  const hasGoals = goalsLoaded && (goals.target_calories || goals.target_protein);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!goalsLoaded ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : hasGoals ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {goals.target_calories && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">Calories</p>
                    <p className="font-semibold">{goals.target_calories} kcal</p>
                  </div>
                )}
                {goals.target_protein && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">Protein</p>
                    <p className="font-semibold">{goals.target_protein}g</p>
                  </div>
                )}
                {goals.target_carbs && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">Carbs</p>
                    <p className="font-semibold">{goals.target_carbs}g</p>
                  </div>
                )}
                {goals.target_fats && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-[10px] text-muted-foreground">Fats</p>
                    <p className="font-semibold">{goals.target_fats}g</p>
                  </div>
                )}
              </div>
              {goals.target_weight && (
                <p className="text-xs text-muted-foreground">Target weight: {goals.target_weight} kg</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No goals set yet. Set your health goals to get personalized recommendations.</p>
          )}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setGoalsOpen(true)}>
            {hasGoals ? "Edit goals" : "Set goals"}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!prefsLoaded ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : prefs.dietary_preferences.length > 0 || prefs.workout_preferences.length > 0 ? (
            <div className="space-y-2">
              {prefs.dietary_preferences.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Diet</p>
                  <div className="flex flex-wrap gap-1">
                    {prefs.dietary_preferences.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {prefs.workout_preferences.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Workouts</p>
                  <div className="flex flex-wrap gap-1">
                    {prefs.workout_preferences.map((w) => (
                      <Badge key={w} variant="secondary" className="text-xs">{w}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Units: {prefs.units === "metric" ? "Metric" : "Imperial"}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Configure your dietary and workout preferences.</p>
          )}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setPrefsOpen(true)}>
            Edit preferences
          </Button>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" /> Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Connect Gmail, Strava, and Oura to sync your health data.</p>
          <Button variant="outline" size="sm" className="mt-3">Manage integrations</Button>
        </CardContent>
      </Card>

      <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>

      {/* Goals Dialog */}
      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Your Goals</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Daily Calories (kcal)</Label>
                <Input
                  type="number"
                  placeholder="2000"
                  value={goals.target_calories}
                  onChange={(e) => setGoals({ ...goals, target_calories: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={goals.target_protein}
                  onChange={(e) => setGoals({ ...goals, target_protein: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Carbs (g)</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={goals.target_carbs}
                  onChange={(e) => setGoals({ ...goals, target_carbs: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Fats (g)</Label>
                <Input
                  type="number"
                  placeholder="67"
                  value={goals.target_fats}
                  onChange={(e) => setGoals({ ...goals, target_fats: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Target Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="70"
                value={goals.target_weight}
                onChange={(e) => setGoals({ ...goals, target_weight: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveGoals} disabled={goalsSaving} className="w-full">
              {goalsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Goals
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground">Dietary Preferences</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {DIETARY_OPTIONS.map((opt) => {
                  const selected = prefs.dietary_preferences.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        setPrefs({ ...prefs, dietary_preferences: togglePref(prefs.dietary_preferences, opt) })
                      }
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 inline mr-1" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Workout Preferences</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {WORKOUT_OPTIONS.map((opt) => {
                  const selected = prefs.workout_preferences.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        setPrefs({ ...prefs, workout_preferences: togglePref(prefs.workout_preferences, opt) })
                      }
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 inline mr-1" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Units</Label>
              <div className="flex gap-2 mt-2">
                {UNIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs({ ...prefs, units: opt.value })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-1 ${
                      prefs.units === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSavePrefs} disabled={prefsSaving} className="w-full">
              {prefsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GOAL_TYPES = [
  { value: "weight_loss", label: "Weight Loss", emoji: "🔥" },
  { value: "fat_burn", label: "Fat Burn", emoji: "💪" },
  { value: "maintenance", label: "Maintenance", emoji: "⚖️" },
  { value: "muscle_gain", label: "Muscle Gain", emoji: "🏋️" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const EXERCISE_DAYS = [1, 2, 3, 4, 5, 6, 7];

export interface GoalsData {
  goal_type: string;
  target_calories: string;
  target_protein: string;
  target_carbs: string;
  target_fats: string;
  target_weight: string;
  current_weight: string;
  height: string;
  exercise_days_per_week: number;
  gender: string;
  age: string;
}

interface GoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialData?: GoalsData;
  existingGoalId: string | null;
  onSaved: (data: GoalsData, goalId: string) => void;
}

function recommendMacros(goalType: string, currentWeight: number, height: number, exerciseDays: number, gender: string, age: number) {
  // Mifflin-St Jeor
  const bmr = gender === "female"
    ? 10 * currentWeight + 6.25 * height - 5 * age - 161
    : 10 * currentWeight + 6.25 * height - 5 * age + 5;

  const activityMultiplier = 1.2 + (exerciseDays * 0.05);
  const tdee = Math.round(bmr * activityMultiplier);

  let calories: number;
  let proteinRatio: number;
  let carbRatio: number;
  let fatRatio: number;

  switch (goalType) {
    case "weight_loss":
      calories = tdee - 500;
      proteinRatio = 0.35; carbRatio = 0.35; fatRatio = 0.30;
      break;
    case "fat_burn":
      calories = tdee - 400;
      proteinRatio = 0.40; carbRatio = 0.30; fatRatio = 0.30;
      break;
    case "muscle_gain":
      calories = tdee + 300;
      proteinRatio = 0.35; carbRatio = 0.40; fatRatio = 0.25;
      break;
    case "maintenance":
    default:
      calories = tdee;
      proteinRatio = 0.30; carbRatio = 0.40; fatRatio = 0.30;
      break;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round((calories * proteinRatio) / 4),
    carbs: Math.round((calories * carbRatio) / 4),
    fats: Math.round((calories * fatRatio) / 9),
  };
}

function calcBMI(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-yellow-500" };
  if (bmi < 25) return { label: "Normal", color: "text-green-500" };
  if (bmi < 30) return { label: "Overweight", color: "text-orange-500" };
  return { label: "Obese", color: "text-red-500" };
}

export default function GoalsDialog({ open, onOpenChange, userId, initialData, existingGoalId, onSaved }: GoalsDialogProps) {
  const defaultData: GoalsData = {
    goal_type: "maintenance",
    target_calories: "", target_protein: "", target_carbs: "", target_fats: "",
    target_weight: "", current_weight: "", height: "",
    exercise_days_per_week: 3, gender: "male", age: "30",
  };

  const [goals, setGoals] = useState<GoalsData>(initialData || defaultData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) setGoals(initialData);
  }, [initialData]);

  const bmi = useMemo(() => {
    return calcBMI(parseFloat(goals.current_weight), parseFloat(goals.height));
  }, [goals.current_weight, goals.height]);

  const handleRecommend = () => {
    const w = parseFloat(goals.current_weight);
    const h = parseFloat(goals.height);
    const a = parseInt(goals.age) || 30;
    if (!w || !h) { toast.error("Enter current weight and height first"); return; }
    const rec = recommendMacros(goals.goal_type, w, h, goals.exercise_days_per_week, goals.gender, a);
    setGoals((prev) => ({
      ...prev,
      target_calories: rec.calories.toString(),
      target_protein: rec.protein.toString(),
      target_carbs: rec.carbs.toString(),
      target_fats: rec.fats.toString(),
    }));
    toast.success("Recommended values applied!");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        goal_type: goals.goal_type,
        is_active: true,
        target_calories: goals.target_calories ? parseInt(goals.target_calories) : null,
        target_protein: goals.target_protein ? parseInt(goals.target_protein) : null,
        target_carbs: goals.target_carbs ? parseInt(goals.target_carbs) : null,
        target_fats: goals.target_fats ? parseInt(goals.target_fats) : null,
        target_weight: goals.target_weight ? parseFloat(goals.target_weight) : null,
        current_weight: goals.current_weight ? parseFloat(goals.current_weight) : null,
        height: goals.height ? parseFloat(goals.height) : null,
        exercise_days_per_week: goals.exercise_days_per_week,
        gender: goals.gender,
        age: parseInt(goals.age) || 30,
      };

      if (existingGoalId) {
        const { error } = await supabase.from("goals").update(payload).eq("id", existingGoalId);
        if (error) throw error;
        onSaved(goals, existingGoalId);
      } else {
        const { data, error } = await supabase.from("goals").insert(payload).select().single();
        if (error) throw error;
        onSaved(goals, data.id);
      }
      toast.success("Goals saved!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save goals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Your Goals</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Goal Type */}
          <div>
            <Label className="text-xs text-muted-foreground">Goal Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {GOAL_TYPES.map((gt) => (
                <button
                  key={gt.value}
                  onClick={() => setGoals({ ...goals, goal_type: gt.value })}
                  className={`text-sm px-3 py-2.5 rounded-lg border transition-colors text-left flex items-center gap-2 ${
                    goals.goal_type === gt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <span>{gt.emoji}</span>
                  <span>{gt.label}</span>
                  {goals.goal_type === gt.value && <Check className="h-3.5 w-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Gender & Age */}
          <div>
            <Label className="text-xs text-muted-foreground">About You</Label>
            <div className="flex gap-3 mt-2">
              <div className="flex gap-2 flex-1">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoals({ ...goals, gender: g.value })}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors flex-1 ${
                      goals.gender === g.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  placeholder="Age"
                  value={goals.age}
                  onChange={(e) => setGoals({ ...goals, age: e.target.value })}
                  className="text-center"
                />
              </div>
            </div>
          </div>

          {/* Exercise Days */}
          <div>
            <Label className="text-xs text-muted-foreground">Exercise Days per Week</Label>
            <div className="flex gap-1.5 mt-2">
              {EXERCISE_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setGoals({ ...goals, exercise_days_per_week: d })}
                  className={`text-xs w-9 h-9 rounded-full border transition-colors font-medium ${
                    goals.exercise_days_per_week === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Body Metrics */}
          <div>
            <Label className="text-xs text-muted-foreground">Body Metrics</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <Label className="text-[10px]">Current Weight (kg)</Label>
                <Input type="number" step="0.1" placeholder="75" value={goals.current_weight} onChange={(e) => setGoals({ ...goals, current_weight: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Target Weight (kg)</Label>
                <Input type="number" step="0.1" placeholder="70" value={goals.target_weight} onChange={(e) => setGoals({ ...goals, target_weight: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Height (cm)</Label>
                <Input type="number" placeholder="175" value={goals.height} onChange={(e) => setGoals({ ...goals, height: e.target.value })} />
              </div>
            </div>
            {bmi && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">BMI:</span>
                <span className="font-semibold">{bmi}</span>
                <span className={`text-xs font-medium ${bmiCategory(bmi).color}`}>({bmiCategory(bmi).label})</span>
              </div>
            )}
          </div>

          {/* Recommend button */}
          <Button variant="outline" size="sm" className="w-full" onClick={handleRecommend}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Recommend daily intake based on my goals
          </Button>

          {/* Macros */}
          <div>
            <Label className="text-xs text-muted-foreground">Daily Targets (adjustable)</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-[10px]">Calories (kcal)</Label>
                <Input type="number" placeholder="2000" value={goals.target_calories} onChange={(e) => setGoals({ ...goals, target_calories: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Protein (g)</Label>
                <Input type="number" placeholder="100" value={goals.target_protein} onChange={(e) => setGoals({ ...goals, target_protein: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Carbs (g)</Label>
                <Input type="number" placeholder="250" value={goals.target_carbs} onChange={(e) => setGoals({ ...goals, target_carbs: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Fats (g)</Label>
                <Input type="number" placeholder="67" value={goals.target_fats} onChange={(e) => setGoals({ ...goals, target_fats: e.target.value })} />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Goals
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

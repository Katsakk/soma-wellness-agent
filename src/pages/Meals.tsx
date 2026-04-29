import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, UtensilsCrossed, Loader2, Sparkles, Trash2, Pencil, Mic, MicOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { compressImage } from "@/lib/imageUtils";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import TodayMealsView from "@/components/meals/TodayMealsView";
import WeeklyMealsView from "@/components/meals/WeeklyMealsView";
import MonthlyMealsView from "@/components/meals/MonthlyMealsView";

interface MacroEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
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

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast", icon: "☀️" },
  { value: "lunch",     label: "Lunch",     icon: "🥗" },
  { value: "dinner",    label: "Dinner",    icon: "🌙" },
  { value: "snack",     label: "Snack",     icon: "🍎" },
] as const;
type MealType = typeof MEAL_TYPES[number]["value"];

const MEAL_SUGGESTIONS: Record<MealType, string[]> = {
  breakfast: ["Overnight oats with banana", "Eggs and avocado toast", "Greek yoghurt with berries", "Protein smoothie"],
  lunch:     ["Chicken salad wrap", "Salmon rice bowl", "Lentil soup", "Grilled chicken with quinoa"],
  dinner:    ["Steak with sweet potato", "Pasta with turkey bolognese", "Salmon with vegetables", "Stir-fry chicken and rice"],
  snack:     ["Protein bar", "Apple with peanut butter", "Cottage cheese", "Handful of nuts"],
};

const MACRO_CONFIG = [
  { key: "calories" as const, label: "Calories", unit: "kcal", colorToken: "--metric-calories" },
  { key: "protein"  as const, label: "Protein",  unit: "g",    colorToken: "--metric-protein"  },
  { key: "carbs"    as const, label: "Carbs",    unit: "g",    colorToken: "--metric-carbs"    },
  { key: "fats"     as const, label: "Fat",      unit: "g",    colorToken: "--metric-fat"      },
];

const Meals = () => {
  const { user } = useAuth();
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [allMeals, setAllMeals]     = useState<Meal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [open, setOpen]             = useState(false);
  const [mealType, setMealType]     = useState<MealType>("breakfast");
  const [description, setDescription] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate]     = useState<MacroEstimate | null>(null);
  const [saving, setSaving]         = useState(false);
  const [tab, setTab]               = useState("today");
  const [targets, setTargets]       = useState(DEFAULT_TARGETS);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [mealDate, setMealDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const mealFileInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setDescription((prev) => (prev ? prev + " " + text : text));
  }, []);
  const { isRecording, start: startRecording, stop: stopRecording, isSupported: voiceSupported } =
    useVoiceRecording(handleVoiceResult);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
    } catch {
      toast.error("Failed to process image");
    }
    if (mealFileInputRef.current) mealFileInputRef.current.value = "";
  };

  const fetchMeals = async () => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = subDays(new Date(), 30);

    const [todayRes, allRes, goalsRes] = await Promise.all([
      supabase.from("meals").select("*").eq("user_id", user.id)
        .gte("meal_time", todayStart.toISOString()).order("meal_time", { ascending: false }),
      supabase.from("meals").select("*").eq("user_id", user.id)
        .gte("meal_time", monthStart.toISOString()).order("meal_time", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", user.id).eq("is_active", true).limit(1),
    ]);

    setTodayMeals(todayRes.data || []);
    setAllMeals(allRes.data || []);

    if (goalsRes.data?.[0]) {
      const g = goalsRes.data[0];
      setTargets({
        calories: g.target_calories || DEFAULT_TARGETS.calories,
        protein:  g.target_protein  || DEFAULT_TARGETS.protein,
        carbs:    g.target_carbs    || DEFAULT_TARGETS.carbs,
        fats:     g.target_fats     || DEFAULT_TARGETS.fats,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchMeals(); }, [user]);

  const handleEstimate = async (text = description, img = pendingImage) => {
    if (!text.trim() && !img) return;
    setEstimating(true);
    setEstimate(null);
    try {
      const typeLabel = MEAL_TYPES.find((t) => t.value === mealType)?.label ?? mealType;
      const { data, error } = await supabase.functions.invoke("estimate-macros", {
        body: {
          description: text.trim() ? `${typeLabel}: ${text.trim()}` : undefined,
          image: img || undefined,
        },
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
      const mealDateTime = new Date(`${mealDate}T12:00:00`);
      const { error } = await supabase.from("meals").insert({
        user_id:   user.id,
        name:      estimate.name,
        calories:  Math.round(estimate.calories),
        protein:   Math.round(estimate.protein),
        carbs:     Math.round(estimate.carbs),
        fats:      Math.round(estimate.fats),
        fiber:     estimate.fiber != null ? Math.round(estimate.fiber) : null,
        notes:     `[${mealType}] ${description.trim()}`,
        source:    "ai_estimate",
        meal_time: mealDateTime.toISOString(),
      });
      if (error) throw error;
      toast.success("Meal logged!");
      setOpen(false);
      setDescription("");
      setEstimate(null);
      setPendingImage(null);
      setMealDate(format(new Date(), "yyyy-MM-dd"));
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

  const handleEditDate = async (id: string, newDate: string) => {
    const mealDateTime = new Date(`${newDate}T12:00:00`);
    const { error } = await supabase.from("meals").update({ meal_time: mealDateTime.toISOString() }).eq("id", id);
    if (error) {
      toast.error("Failed to update meal date");
    } else {
      fetchMeals();
      toast.success("Meal date updated");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6 pb-32">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Food</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your daily nutrition</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDescription(""); setEstimate(null); setMealType("breakfast"); setPendingImage(null); setMealDate(format(new Date(), "yyyy-MM-dd")); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Log meal
            </Button>
          </DialogTrigger>

          {/* ── Log meal dialog ─────────────────────────────────── */}
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log a meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">

              {/* Meal type chips */}
              <div className="flex gap-2">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setMealType(t.value); setEstimate(null); }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all ${
                      mealType === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Date picker */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Date</label>
                <input
                  type="date"
                  value={mealDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Suggestion chips */}
              {!estimate && (
                <div className="flex flex-wrap gap-1.5">
                  {MEAL_SUGGESTIONS[mealType].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setDescription(s); handleEstimate(s); }}
                      disabled={estimating}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat-style input */}
              {!estimate && (
                <div className="surface-elevated p-3 space-y-2">
                  {pendingImage && (
                    <div className="relative inline-block">
                      <div className="h-16 w-16 rounded-xl border border-border overflow-hidden">
                        <img src={pendingImage} alt="Meal" className="h-full w-full object-cover" />
                      </div>
                      <button
                        onClick={() => setPendingImage(null)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <textarea
                    placeholder={`What did you have for ${MEAL_TYPES.find(t => t.value === mealType)?.label.toLowerCase()}?`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEstimate(); } }}
                    disabled={estimating}
                    rows={2}
                    className={`w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed ${isRecording ? "text-primary" : ""}`}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => mealFileInputRef.current?.click()}
                        disabled={estimating}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <input
                        ref={mealFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {voiceSupported && (
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={estimating}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                            isRecording
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                        >
                          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleEstimate()}
                      disabled={estimating || (!description.trim() && !pendingImage)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
                    >
                      {estimating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Sparkles className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {estimating && (
                <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Estimating macros…
                </div>
              )}

              {estimate && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground">{estimate.name}</p>
                    <button
                      onClick={() => setEstimate(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MACRO_CONFIG.map(({ key, label, unit, colorToken }) => (
                      <div key={key} className="surface-elevated p-3 flex items-center gap-2.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: `hsl(var(${colorToken}))` }}
                        />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                            {label}
                          </p>
                          <p className="text-sm font-bold" style={{ color: `hsl(var(${colorToken}))` }}>
                            {Math.round(estimate[key])}
                            <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">AI-estimated values.</p>
                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save meal
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Time period tabs ────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="today"   className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="weekly"  className="flex-1">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
        </TabsList>

        {/* ── Today ─────────────────────────────────────────────── */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayMeals.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              colorToken="--metric-calories"
              title="No meals logged today"
              subtitle="Describe what you ate and AI will estimate the macros"
            />
          ) : (
            <>
              <TodayMealsView meals={todayMeals} targets={targets} />
              <div className="space-y-2">
                {todayMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} onDelete={handleDelete} onEditDate={handleEditDate} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Weekly ────────────────────────────────────────────── */}
        <TabsContent value="weekly" className="mt-4">
          {loading
            ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : <WeeklyMealsView meals={allMeals} />}
        </TabsContent>

        {/* ── Monthly ───────────────────────────────────────────── */}
        <TabsContent value="monthly" className="mt-4">
          {loading
            ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : <MonthlyMealsView meals={allMeals} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Meal card ─────────────────────────────────────────────────────────────────

function MealCard({ meal, onDelete, onEditDate }: {
  meal: Meal;
  onDelete: (id: string) => void;
  onEditDate: (id: string, date: string) => void;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(format(new Date(meal.meal_time), "yyyy-MM-dd"));

  const handleDateConfirm = () => {
    setEditingDate(false);
    onEditDate(meal.id, dateValue);
  };

  return (
    <div className="surface-elevated p-4 flex items-center justify-between group">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className="mt-1 w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: "hsl(var(--metric-calories))" }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground truncate">{meal.name}</p>
          <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
            <span style={{ color: "hsl(var(--metric-calories))" }}>{meal.calories ?? 0} kcal</span>
            <span>{meal.protein ?? 0}g protein</span>
            <span>{meal.carbs ?? 0}g carbs</span>
            <span>{meal.fats ?? 0}g fat</span>
          </div>
          {editingDate && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={dateValue}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setDateValue(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={handleDateConfirm} className="text-xs text-primary hover:underline">Save</button>
              <button onClick={() => setEditingDate(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            </div>
          )}
          {meal.notes && !editingDate && (
            <p className="text-xs text-muted-foreground mt-1 truncate italic">"{meal.notes}"</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="text-xs text-muted-foreground">
          {format(new Date(meal.meal_time), "MMM d, h:mm a")}
        </span>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
          onClick={() => setEditingDate((v) => !v)}
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
          onClick={() => onDelete(meal.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon, colorToken, title, subtitle,
}: {
  icon: React.ElementType; colorToken: string; title: string; subtitle: string;
}) {
  return (
    <div className="surface-elevated flex flex-col items-center justify-center py-16 text-center px-6">
      <div
        className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
        style={{ backgroundColor: `hsl(var(${colorToken}) / 0.12)` }}
      >
        <Icon className="h-6 w-6" style={{ color: `hsl(var(${colorToken}))` }} />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
    </div>
  );
}

export default Meals;

import { Coffee, Sun, Moon } from "lucide-react";

interface Meal {
  name: string;
  calories: number | null;
  meal_time: string;
  notes: string | null;
}

interface MealCategoryCardsProps {
  meals: Meal[];
}

const MEAL_KEYWORDS: Record<string, string[]> = {
  breakfast: ["breakfast", "morning"],
  lunch: ["lunch", "midday", "noon"],
  dinner: ["dinner", "supper", "evening"],
};

function categorizeMeal(meal: Meal, orderIndex: number): "breakfast" | "lunch" | "dinner" {
  // Check name and notes for explicit keywords
  const text = `${meal.name} ${meal.notes || ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(MEAL_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return cat as any;
  }
  // Fall back to order: 1st = breakfast, 2nd = lunch, 3rd+ = dinner
  if (orderIndex === 0) return "breakfast";
  if (orderIndex === 1) return "lunch";
  return "dinner";
}

const categories = [
  { key: "breakfast" as const, label: "Breakfast", icon: Coffee },
  { key: "lunch" as const, label: "Lunch", icon: Sun },
  { key: "dinner" as const, label: "Dinner", icon: Moon },
];

const MealCategoryCards = ({ meals }: MealCategoryCardsProps) => {
  // Sort by meal_time ascending so the first logged = breakfast
  const sorted = [...meals].sort(
    (a, b) => new Date(a.meal_time).getTime() - new Date(b.meal_time).getTime()
  );

  const grouped = { breakfast: 0, lunch: 0, dinner: 0 };
  sorted.forEach((m, i) => {
    const cat = categorizeMeal(m, i);
    grouped[cat] += m.calories || 0;
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="rounded-xl border bg-card p-3 text-center space-y-1"
        >
          <Icon className="h-4 w-4 mx-auto text-warning" />
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">
            {Math.round(grouped[key])}{" "}
            <span className="text-[10px] font-normal text-muted-foreground">kcal</span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default MealCategoryCards;

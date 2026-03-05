import { Coffee, Sun, Moon } from "lucide-react";

interface Meal {
  name: string;
  calories: number | null;
  meal_time: string;
}

interface MealCategoryCardsProps {
  meals: Meal[];
}

const getMealCategory = (mealTime: string): "breakfast" | "lunch" | "dinner" => {
  const hour = new Date(mealTime).getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  return "dinner";
};

const categories = [
  { key: "breakfast" as const, label: "Breakfast", icon: Coffee },
  { key: "lunch" as const, label: "Lunch", icon: Sun },
  { key: "dinner" as const, label: "Dinner", icon: Moon },
];

const MealCategoryCards = ({ meals }: MealCategoryCardsProps) => {
  const grouped = meals.reduce(
    (acc, m) => {
      const cat = getMealCategory(m.meal_time);
      acc[cat] += m.calories || 0;
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0 } as Record<string, number>
  );

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

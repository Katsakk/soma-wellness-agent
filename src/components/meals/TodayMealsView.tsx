import CalorieGauge from "./CalorieGauge";
import MacroProgressBar from "./MacroProgressBar";
import MealCategoryCards from "./MealCategoryCards";
import { Card, CardContent } from "@/components/ui/card";

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

interface TodayMealsViewProps {
  meals: Meal[];
  targets: { calories: number; protein: number; carbs: number; fats: number };
}

const TodayMealsView = ({ meals, targets }: TodayMealsViewProps) => {
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fats: acc.fats + (m.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="space-y-4">
      <MealCategoryCards meals={meals} />

      <Card>
        <CardContent className="pt-6 pb-4 space-y-2">
          <CalorieGauge consumed={totals.calories} target={targets.calories} />
          <div className="flex items-center gap-0 pt-2">
            <MacroProgressBar
              label="Protein"
              current={totals.protein}
              target={targets.protein}
              color="bg-primary"
            />
            <MacroProgressBar
              label="Carbs"
              current={totals.carbs}
              target={targets.carbs}
              color="bg-warning"
            />
            <MacroProgressBar
              label="Fat"
              current={totals.fats}
              target={targets.fats}
              color="bg-destructive"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TodayMealsView;

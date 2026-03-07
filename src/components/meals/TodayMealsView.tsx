import CalorieGauge from "./CalorieGauge";
import MacroProgressBar from "./MacroProgressBar";
import MealCategoryCards from "./MealCategoryCards";

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
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fats:     acc.fats     + (m.fats     || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="space-y-4">
      <MealCategoryCards meals={meals} />

      <div className="surface-elevated p-5 space-y-4">
        <CalorieGauge consumed={totals.calories} target={targets.calories} />
        <div className="flex items-center gap-0 pt-1">
          <MacroProgressBar
            label="Protein"
            current={totals.protein}
            target={targets.protein}
            colorToken="--metric-protein"
          />
          <MacroProgressBar
            label="Carbs"
            current={totals.carbs}
            target={targets.carbs}
            colorToken="--metric-carbs"
          />
          <MacroProgressBar
            label="Fat"
            current={totals.fats}
            target={targets.fats}
            colorToken="--metric-fat"
          />
        </div>
      </div>
    </div>
  );
};

export default TodayMealsView;

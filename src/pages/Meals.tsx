import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UtensilsCrossed } from "lucide-react";

const Meals = () => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meals</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your daily nutrition</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Log meal
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-xl bg-muted p-4 mb-4">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No meals logged today</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Log your first meal to start tracking macros
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Meals;

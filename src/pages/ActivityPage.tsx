import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Plus } from "lucide-react";

const ActivityPage = () => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground text-sm mt-1">Workouts and exercise history</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Generate workout
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-xl bg-muted p-4 mb-4">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No workouts yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a workout or sync from your integrations
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityPage;

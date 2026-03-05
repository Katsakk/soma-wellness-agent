import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const CalendarPage = () => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">Your unified health timeline</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-xl bg-muted p-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Timeline coming soon</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your meals, workouts, and recovery will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
